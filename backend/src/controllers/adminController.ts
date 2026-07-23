import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Role, PlanSaaS } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me';

// Función auxiliar para registrar logs de auditoría
async function logAudit(tipoEvento: string, descripcion: string, req: AuthenticatedRequest, prestamistaId?: string) {
  try {
    await prisma.logActividadSaaS.create({
      data: {
        tipoEvento,
        descripcion,
        ip: req.ip || '0.0.0.0',
        prestamistaId
      }
    });
  } catch (err) {
    console.error('Error al registrar auditoría:', err);
  }
}

// 1. Obtener todos los prestamistas (tenants)
export async function getTenants(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const tenants = await prisma.user.findMany({
      where: { rol: Role.PRESTAMISTA },
      select: {
        id: true, nombre: true, username: true, email: true, telefono: true,
        plan: true, suspendido: true, fechaPruebaFin: true, paymentDate: true, createdAt: true,
        _count: {
          select: {
            cobradores: true,
            loans: { where: { estado: 'ACTIVE' } }
          }
        },
        cobradores: {
          select: { id: true, nombre: true, username: true, telefono: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(tenants);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// 2. Crear un nuevo Prestamista (Tenant)
export async function createTenant(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  const { nombre, username, password, email, telefono, plan } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username y password requeridos' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const fechaPruebaFin = new Date();
    fechaPruebaFin.setDate(fechaPruebaFin.getDate() + 30);

    const newTenant = await prisma.user.create({
      data: {
        nombre: nombre || username,
        username,
        password: hash,
        email,
        telefono: telefono || '+50600000000',
        rol: Role.PRESTAMISTA,
        plan: plan || PlanSaaS.BRONCE,
        fechaPruebaFin
      }
    });

    // Crear configuraciones por defecto
    await prisma.businessSettings.create({
      data: {
        userId: newTenant.id,
        monedaSimbolo: '₡',
        monedaCodigo: 'CRC',
        nombreNegocio: nombre || 'Mi Negocio Crediticio',
        gananciaPorcentaje: 50
      }
    });

    await logAudit('CREAR_TENANT', `Se creó el prestamista ${username}`, req, newTenant.id);
    return res.json({ success: true, tenant: newTenant });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// 3. Suspender o Activar Tenant
export async function toggleSuspendTenant(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Cliente no encontrado' });

    const newStatus = !user.suspendido;
    await prisma.user.update({
      where: { id: user.id },
      data: { suspendido: newStatus }
    });

    await logAudit(newStatus ? 'SUSPENDER_TENANT' : 'ACTIVAR_TENANT', `El prestamista ${user.username} fue ${newStatus ? 'suspendido' : 'activado'}`, req, user.id);
    return res.json({ success: true, suspendido: newStatus });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// 4. Cambiar Plan
export async function changeTenantPlan(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const { plan } = req.body;
    const { PlanManager } = await import('../services/planManager.js');
    const config = await PlanManager.getPlanConfig(plan);

    // If the plan has maxCobradores limit (i.e. not -1)
    if (config && config.maxCobradores !== -1) {
      if (isUsingMemoryStore()) {
        const activeCobradores = inMemoryStore.users.filter(u => u.prestamistaId === req.params.id && u.rol === Role.COBRADOR && !(u as any).suspendido);
        if (activeCobradores.length > config.maxCobradores) {
          inMemoryStore.users.forEach(u => {
            if (u.prestamistaId === req.params.id && u.rol === Role.COBRADOR) {
              (u as any).suspendido = true;
            }
          });
        }
      } else {
        const activeCobradoresCount = await prisma.user.count({
          where: {
            prestamistaId: req.params.id,
            rol: Role.COBRADOR,
            suspendido: false
          }
        });
        if (activeCobradoresCount > config.maxCobradores) {
          // Suspend all cobradores for this lender
          await prisma.user.updateMany({
            where: {
              prestamistaId: req.params.id,
              rol: Role.COBRADOR
            },
            data: {
              suspendido: true
            }
          });
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { plan }
    });

    await logAudit('CAMBIO_PLAN', `El plan de ${user.username} cambió a ${plan}`, req, user.id);
    return res.json({ success: true, plan });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// 4b. Actualizar fecha de vencimiento (paymentDate)
export async function updateTenantPaymentDate(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const { paymentDate } = req.body;
    if (isUsingMemoryStore()) {
      const user = inMemoryStore.users.find(u => u.id === req.params.id);
      if (user) {
        (user as any).paymentDate = paymentDate ? new Date(paymentDate) : null;
      }
      return res.json({ success: true, paymentDate });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { paymentDate: paymentDate ? new Date(paymentDate) : null }
    });
    await logAudit('ACTUALIZAR_VENCIMIENTO', `Fecha de vencimiento de ${user.username} actualizada`, req, user.id);
    return res.json({ success: true, paymentDate: user.paymentDate });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// 5. Suplantación (Impersonate)
export async function impersonateTenant(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const targetId = req.params.prestamistaId;
    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser || targetUser.rol !== Role.PRESTAMISTA) {
      return res.status(404).json({ error: 'Prestamista no encontrado' });
    }

    const token = jwt.sign(
      {
        id: targetUser.id,
        email: targetUser.email,
        nombre: targetUser.nombre,
        rol: targetUser.rol,
        isImpersonating: true,
        originalRol: Role.ADMIN,
        adminId: req.user.id
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    await logAudit('IMPERSONATE', `Admin accedió como ${targetUser.username}`, req, targetUser.id);
    return res.json({ success: true, token, user: targetUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function impersonateCobrador(req: AuthenticatedRequest, res: Response) {
  // Se permite si el rol actual es ADMIN, o si es una sesión impersonada (isImpersonating: true)
  // La seguridad real está en validar que el cobrador pertenece al prestamista suplantado
  const isAdmin = req.user?.rol === Role.ADMIN;
  const isImpersonating = req.user?.isImpersonating === true;

  if (!isAdmin && !isImpersonating) {
    return res.status(403).json({ error: 'Denegado. Solo administradores o sesiones de suplantación pueden acceder.' });
  }

  const caller = req.user!;

  try {
    const { cobradorId } = req.params;

    if (isUsingMemoryStore()) {
      const cobrador = inMemoryStore.users.find(u => u.id === cobradorId && u.rol === Role.COBRADOR);
      if (!cobrador) {
        return res.status(404).json({ error: 'Cobrador no encontrado' });
      }

      // Validar que el cobrador pertenece al prestamista suplantado actual (caller.id)
      const targetLenderId = caller.id;
      if (cobrador.prestamistaId !== targetLenderId && caller.rol !== Role.ADMIN) {
        return res.status(403).json({ error: 'El cobrador no pertenece al prestamista actual' });
      }

      const token = jwt.sign(
        {
          id: cobrador.id,
          email: cobrador.email,
          nombre: cobrador.nombre,
          rol: Role.COBRADOR,
          prestamistaId: cobrador.prestamistaId,
          isImpersonating: true,
          originalRol: Role.ADMIN,
          adminId: caller.adminId || caller.id
        },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      return res.json({ success: true, token, user: cobrador });
    }

    const cobrador = await prisma.user.findUnique({ where: { id: cobradorId } });
    if (!cobrador || cobrador.rol !== Role.COBRADOR) {
      return res.status(404).json({ error: 'Cobrador no encontrado' });
    }

    const targetLenderId = caller.id;
    if (cobrador.prestamistaId !== targetLenderId && caller.rol !== Role.ADMIN) {
      return res.status(403).json({ error: 'El cobrador no pertenece al prestamista suplantado' });
    }

    const token = jwt.sign(
      {
        id: cobrador.id,
        email: cobrador.email,
        nombre: cobrador.nombre,
        rol: Role.COBRADOR,
        prestamistaId: cobrador.prestamistaId,
        isImpersonating: true,
        originalRol: Role.ADMIN,
        adminId: caller.adminId || caller.id
      },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    await logAudit('IMPERSONATE_COBRADOR', `Admin accedió al cobrador ${cobrador.username}`, req, cobrador.id);
    return res.json({ success: true, token, user: cobrador });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// 6. Obtener Logs de Auditoría
export async function getLogs(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const tipoEvento = req.query.tipoEvento as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const where: any = {};

    if (tipoEvento) {
      where.tipoEvento = tipoEvento;
    }

    if (startDate || endDate) {
      where.fecha = {};
      if (startDate) {
        where.fecha.gte = new Date(`${startDate}T00:00:00-06:00`);
      }
      if (endDate) {
        where.fecha.lte = new Date(`${endDate}T23:59:59.999-06:00`);
      }
    }

    const [total, logs] = await Promise.all([
      prisma.logActividadSaaS.count({ where }),
      prisma.logActividadSaaS.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip,
        take: limit
      })
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// 7. Obtener Stats
export async function getStats(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const totalPrestamistas = await prisma.user.count({ where: { rol: Role.PRESTAMISTA } });
    const totalCobradores = await prisma.user.count({ where: { rol: Role.COBRADOR } });
    const totalPrestamos = await prisma.loan.count();
    
    // Distribución de planes
    const bronce = await prisma.user.count({ where: { rol: Role.PRESTAMISTA, plan: PlanSaaS.BRONCE } });
    const plata = await prisma.user.count({ where: { rol: Role.PRESTAMISTA, plan: PlanSaaS.PLATA } });
    const oro = await prisma.user.count({ where: { rol: Role.PRESTAMISTA, plan: PlanSaaS.ORO } });
    const platino = await prisma.user.count({ where: { rol: Role.PRESTAMISTA, plan: PlanSaaS.PLATINO } });
    const diamante = await prisma.user.count({ where: { rol: Role.PRESTAMISTA, plan: PlanSaaS.DIAMANTE } });

    // Volumen de transacciones (Pagos)
    const pagos = await prisma.payment.aggregate({
      _sum: { montoAbonado: true }
    });

    return res.json({
      totalPrestamistas,
      totalCobradores,
      totalPrestamos,
      planes: { bronce, plata, oro, platino, diamante },
      volumenTransaccional: pagos._sum.montoAbonado || 0
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// 8. Obtener configuración de los planes SaaS
export async function getPlanConfigs(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const { PlanManager } = await import('../services/planManager.js');
    const configs = await PlanManager.getAllPlanConfigs();
    return res.json(configs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// 9. Actualizar configuración de un plan SaaS
export async function updatePlanConfig(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const { plan, maxClientes, maxCobradores, precioMensual } = req.body;
    const { PlanManager } = await import('../services/planManager.js');
    const config = await PlanManager.updatePlanConfig(plan, maxClientes, maxCobradores, precioMensual);
    
    await logAudit('ACTUALIZAR_PLAN', `El admin actualizó los límites y precio del plan ${plan}`, req);
    return res.json({ success: true, config });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
