import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../services/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

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
  if (req.user?.rol !== 'ADMIN') return res.status(403).json({ error: 'Denegado' });
  try {
    const tenants = await prisma.user.findMany({
      where: { rol: 'PRESTAMISTA' },
      select: {
        id: true, nombre: true, username: true, email: true, telefono: true,
        plan: true, suspendido: true, fechaPruebaFin: true, createdAt: true
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
  if (req.user?.rol !== 'ADMIN') return res.status(403).json({ error: 'Denegado' });
  const { nombre, username, password, email, telefono, plan } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username y password requeridos' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const newTenant = await prisma.user.create({
      data: {
        nombre: nombre || username,
        username,
        password: hash,
        email,
        telefono: telefono || '+50600000000',
        rol: 'PRESTAMISTA',
        plan: plan || 'BRONCE'
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
  if (req.user?.rol !== 'ADMIN') return res.status(403).json({ error: 'Denegado' });
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: 'Tenant no encontrado' });

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
  if (req.user?.rol !== 'ADMIN') return res.status(403).json({ error: 'Denegado' });
  try {
    const { plan } = req.body;
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

// 5. Suplantación (Impersonate)
export async function impersonateTenant(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== 'ADMIN') return res.status(403).json({ error: 'Denegado' });
  try {
    const targetId = req.params.prestamistaId;
    const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
    if (!targetUser || targetUser.rol !== 'PRESTAMISTA') {
      return res.status(404).json({ error: 'Prestamista no encontrado' });
    }

    const token = jwt.sign(
      {
        id: targetUser.id,
        email: targetUser.email,
        nombre: targetUser.nombre,
        rol: targetUser.rol,
        isImpersonating: true
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

// 6. Obtener Logs de Auditoría
export async function getLogs(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== 'ADMIN') return res.status(403).json({ error: 'Denegado' });
  try {
    const logs = await prisma.logActividadSaaS.findMany({
      orderBy: { fecha: 'desc' },
      take: 100
    });
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// 7. Obtener Stats
export async function getStats(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== 'ADMIN') return res.status(403).json({ error: 'Denegado' });
  try {
    const totalPrestamistas = await prisma.user.count({ where: { rol: 'PRESTAMISTA' } });
    const totalCobradores = await prisma.user.count({ where: { rol: 'COBRADOR' } });
    const totalPrestamos = await prisma.loan.count();
    
    // Distribución de planes
    const bronce = await prisma.user.count({ where: { rol: 'PRESTAMISTA', plan: 'BRONCE' } });
    const plata = await prisma.user.count({ where: { rol: 'PRESTAMISTA', plan: 'PLATA' } });
    const oro = await prisma.user.count({ where: { rol: 'PRESTAMISTA', plan: 'ORO' } });

    // Volumen de transacciones (Pagos)
    const pagos = await prisma.payment.aggregate({
      _sum: { montoAbonado: true }
    });

    return res.json({
      totalPrestamistas,
      totalCobradores,
      totalPrestamos,
      planes: { bronce, plata, oro },
      volumenTransaccional: pagos._sum.montoAbonado || 0
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
