import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Role, PlanSaaS } from '@prisma/client';
import { logger } from '../services/logger';
import { sanitizeString, sanitizeUsername, sanitizePhone, isValidEmail } from '../services/validation';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me';

// Función auxiliar para registrar logs de auditoría
async function logAudit(tipoEvento: string, descripcion: string, req: AuthenticatedRequest, targetUserId?: string) {
  if (isUsingMemoryStore()) return;
  const adminId = req.user?.id || 'sys';
  try {
    await prisma.logActividadSaaS.create({
      data: {
        tipoEvento,
        descripcion,
        ip: req.ip || '0.0.0.0',
        prestamistaId: adminId
      }
    });
  } catch (err) {
    logger.warn({ err }, 'Failed to log audit activity');
  }
}

// 1. Obtener todos los Tenants (Prestamistas) con balance
export async function getTenants(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });

  if (isUsingMemoryStore()) {
    const mapped = inMemoryStore.users
      .filter(u => u.rol === Role.PRESTAMISTA)
      .map(u => ({
        ...u,
        _count: {
          loans: inMemoryStore.loans.filter(l => l.prestamistaId === u.id).length,
          cobradores: inMemoryStore.users.filter(cob => cob.rol === Role.COBRADOR && cob.prestamistaId === u.id).length
        }
      }));
    return res.json(mapped);
  }

  try {
    const tenants = await prisma.user.findMany({
      where: { rol: Role.PRESTAMISTA },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: {
            loans: true,
            cobradores: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(tenants);
  } catch (err: any) { next(err); }
}

// 2. Crear un nuevo Prestamista (Tenant)
export async function createTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  const { nombre, username, password, email, telefono, plan } = req.body;

  const cleanNombre = sanitizeString(nombre, 100);
  const cleanUsername = sanitizeUsername(username);
  const cleanTelefono = sanitizePhone(telefono);

  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username no es válido (mínimo 3 caracteres, sin espacios ni caracteres especiales).' });
  }
  if (!password || password.trim().length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'El formato de correo electrónico no es válido.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    
    // Consultar configuración global de SaaS para obtener días de trial por defecto
    let trialDays = Number(process.env.DEFAULT_TRIAL_DAYS) || 14;
    try {
      const globalConfig = await prisma.saasGlobalConfig.findUnique({ where: { id: 'global' } });
      if (globalConfig?.defaultTrialDays) trialDays = globalConfig.defaultTrialDays;
    } catch (_) {}

    const defaultCountryCode = process.env.DEFAULT_COUNTRY_CODE || '+506';

    const fechaPruebaFin = new Date();
    fechaPruebaFin.setDate(fechaPruebaFin.getDate() + trialDays);

    const newTenant = await prisma.user.create({
      data: {
        nombre: cleanNombre || cleanUsername,
        username: cleanUsername,
        password: hash,
        email: email || null,
        telefono: cleanTelefono || `${defaultCountryCode}00000000`,
        rol: Role.PRESTAMISTA,
        plan: plan || PlanSaaS.BRONCE,
        isTrial: true,
        fechaPruebaFin
      }
    });

    // Crear configuraciones por defecto
    await prisma.businessSettings.create({
      data: {
        userId: newTenant.id,
        monedaSimbolo: '₡',
        monedaCodigo: 'CRC',
        nombreNegocio: cleanNombre || 'Mi Negocio Crediticio',
        gananciaPorcentaje: 50
      }
    });

    await logAudit('CREAR_TENANT', `Se creó el prestamista ${cleanUsername} (Trial de ${trialDays} días)`, req, newTenant.id);
    return res.json({ success: true, tenant: newTenant });
  } catch (err: any) { next(err); }
}

// 2b. Obtener Configuración Global de SaaS
export async function getSaasGlobalConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    let config = await prisma.saasGlobalConfig.findUnique({ where: { id: 'global' } });
    if (!config) {
      config = await prisma.saasGlobalConfig.create({
        data: {
          id: 'global',
          defaultTrialDays: Number(process.env.DEFAULT_TRIAL_DAYS) || 14,
          supportWhatsappNumber: process.env.SUPPORT_WHATSAPP_NUMBER || '50672666369',
          graceDays: 0
        }
      });
    }
    return res.json(config);
  } catch (err: any) { next(err); }
}

// 2c. Actualizar Configuración Global de SaaS
export async function updateSaasGlobalConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const { defaultTrialDays, supportWhatsappNumber, graceDays } = req.body;
    const config = await prisma.saasGlobalConfig.upsert({
      where: { id: 'global' },
      update: {
        defaultTrialDays: Number(defaultTrialDays) || 14,
        supportWhatsappNumber: String(supportWhatsappNumber || '50672666369'),
        graceDays: Number(graceDays) || 0
      },
      create: {
        id: 'global',
        defaultTrialDays: Number(defaultTrialDays) || 14,
        supportWhatsappNumber: String(supportWhatsappNumber || '50672666369'),
        graceDays: Number(graceDays) || 0
      }
    });
    await logAudit('UPDATE_SAAS_CONFIG', 'Se actualizó la configuración global del SaaS', req);
    return res.json({ success: true, config });
  } catch (err: any) { next(err); }
}

// 3. Suspender o Activar Tenant
export async function toggleSuspendTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
  } catch (err: any) { next(err); }
}

// 4. Cambiar Plan
export async function changeTenantPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
  } catch (err: any) { next(err); }
}

// 4b. Actualizar fecha de vencimiento (paymentDate)
export async function updateTenantPaymentDate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const { paymentDate } = req.body;
    const isPaying = !!paymentDate;
    if (isUsingMemoryStore()) {
      const user = inMemoryStore.users.find(u => u.id === req.params.id);
      if (user) {
        (user as any).paymentDate = paymentDate ? new Date(paymentDate) : null;
        if (isPaying) (user as any).isTrial = false;
      }
      return res.json({ success: true, paymentDate, isTrial: !isPaying });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { 
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        isTrial: isPaying ? false : undefined
      }
    });
    await logAudit('ACTUALIZAR_VENCIMIENTO', `Fecha de vencimiento de ${user.username} actualizada`, req, user.id);
    return res.json({ success: true, paymentDate: user.paymentDate, isTrial: user.isTrial });
  } catch (err: any) { next(err); }
}

// 4c. Extender o Modificar Período de Prueba (Trial)
export async function extendTenantTrial(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const { days, targetDate } = req.body;
    
    const userToExtend = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!userToExtend) return res.status(404).json({ error: 'Cliente no encontrado' });

    let finalDate: Date;

    if (targetDate) {
      finalDate = new Date(targetDate);
    } else {
      const daysToAdd = Number(days) || 7;
      const baseDate = userToExtend.fechaPruebaFin && new Date(userToExtend.fechaPruebaFin) > new Date()
        ? new Date(userToExtend.fechaPruebaFin)
        : new Date();
      baseDate.setDate(baseDate.getDate() + daysToAdd);
      finalDate = baseDate;
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { 
        fechaPruebaFin: finalDate,
        isTrial: true
      }
    });

    await logAudit('EXTENDER_TRIAL', `Fecha de prueba de ${user.username} actualizada a ${user.fechaPruebaFin?.toISOString()}`, req, user.id);
    return res.json({ success: true, fechaPruebaFin: user.fechaPruebaFin });
  } catch (err: any) { next(err); }
}

// 5. Suplantación (Impersonate)
export async function impersonateTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
    logger.info({ event: 'IMPERSONATE', adminId: req.user?.id, targetId: targetUser.id, targetUsername: targetUser.username }, 'Admin impersonated lender');
    return res.json({ success: true, token, user: targetUser });
  } catch (err: any) { next(err); }
}

export async function impersonateCobrador(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
    logger.info({ event: 'IMPERSONATE_COBRADOR', callerId: caller.id, cobradorId: cobrador.id, cobradorUsername: cobrador.username }, 'Admin impersonated cobrador');
    return res.json({ success: true, token, user: cobrador });
  } catch (err: any) { next(err); }
}

// 6. Obtener Logs de Auditoría
export async function getLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const tipoEvento = req.query.tipoEvento as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const filterPrestamistaId = req.query.prestamistaId as string | undefined;

  if (isUsingMemoryStore()) {
    let logs = [...inMemoryStore.logs];
    if (tipoEvento) logs = logs.filter(l => l.tipoEvento === tipoEvento);
    if (filterPrestamistaId) logs = logs.filter(l => l.prestamistaId === filterPrestamistaId);
    if (startDate) logs = logs.filter(l => new Date(l.fecha) >= new Date(`${startDate}T00:00:00-06:00`));
    if (endDate) logs = logs.filter(l => new Date(l.fecha) <= new Date(`${endDate}T23:59:59.999-06:00`));
    logs.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    const total = logs.length;
    const paginated = logs.slice(skip, skip + limit);
    return res.json({ data: paginated, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
  }

  try {
    const where: any = {};

    if (tipoEvento) {
      where.tipoEvento = tipoEvento;
    }

    if (filterPrestamistaId) {
      where.prestamistaId = filterPrestamistaId;
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
  } catch (err: any) { next(err); }
}

// 7. Obtener Stats
export async function getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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

    // Precios de planes para cálculo MRR
    const { PlanManager } = await import('../services/planManager.js');
    const planConfigs = await PlanManager.getAllPlanConfigs();
    const priceMap: Record<string, number> = {};
    planConfigs.forEach(c => priceMap[c.plan] = Number(c.precioMensual));

    const mrrEstimado = (bronce * (priceMap['BRONCE'] || 5000)) +
                        (plata * (priceMap['PLATA'] || 7500)) +
                        (oro * (priceMap['ORO'] || 10000)) +
                        (platino * (priceMap['PLATINO'] || 20000)) +
                        (diamante * (priceMap['DIAMANTE'] || 30000));

    // Expiraciones / Alertas de cobro
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const porVencerCount = await prisma.user.count({
      where: {
        rol: Role.PRESTAMISTA,
        paymentDate: { gte: now, lte: sevenDaysFromNow }
      }
    });

    const vencidosCount = await prisma.user.count({
      where: {
        rol: Role.PRESTAMISTA,
        paymentDate: { lt: now }
      }
    });

    return res.json({
      totalPrestamistas,
      totalCobradores,
      totalPrestamos,
      mrrEstimado,
      alertasCobro: {
        porVencer: porVencerCount,
        vencidos: vencidosCount
      },
      planes: { bronce, plata, oro, platino, diamante }
    });
  } catch (err: any) { next(err); }
}


// 8. Obtener configuración de los planes SaaS
export async function getPlanConfigs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const { PlanManager } = await import('../services/planManager.js');
    const configs = await PlanManager.getAllPlanConfigs();
    return res.json(configs);
  } catch (err: any) { next(err); }
}

// 9. Actualizar configuración de un plan SaaS
export async function updatePlanConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.ADMIN) return res.status(403).json({ error: 'Denegado' });
  try {
    const { plan, maxClientes, maxCobradores, precioMensual } = req.body;
    const { PlanManager } = await import('../services/planManager.js');
    const config = await PlanManager.updatePlanConfig(plan, maxClientes, maxCobradores, precioMensual);
    
    await logAudit('ACTUALIZAR_PLAN', `El admin actualizó los límites y precio del plan ${plan}`, req);
    return res.json({ success: true, config });
  } catch (err: any) { next(err); }
}
