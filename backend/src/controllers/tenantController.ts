import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../services/db';
import { PlanManager } from '../services/planManager.js';
import * as bcrypt from 'bcryptjs';

// Crear un nuevo cobrador bajo la cuenta del prestamista actual
export async function createCobrador(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== 'PRESTAMISTA') return res.status(403).json({ error: 'Denegado. Solo prestamistas pueden crear cobradores.' });
  const prestamistaId = req.user.id;
  const { nombre, username, password, telefono } = req.body;

  if (!username || !password || !nombre) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const prestamistaInfo = await prisma.user.findUnique({
      where: { id: prestamistaId },
      select: { plan: true }
    });

    if (prestamistaInfo?.plan && prestamistaInfo.plan !== 'DIAMANTE') {
      const cobradorCount = await prisma.user.count({
        where: { prestamistaId, rol: 'COBRADOR' }
      });
      const planConfig = await PlanManager.getPlanConfig(prestamistaInfo.plan as any);

      if (planConfig.maxCobradores !== -1 && cobradorCount >= planConfig.maxCobradores) {
        return res.status(403).json({ 
          error: `Límite de plan ${prestamistaInfo.plan} alcanzado (máximo ${planConfig.maxCobradores} cobradores). Por favor, contacte al administrador.` 
        });
      }
    }

    // 2. Crear cobrador
    const hash = await bcrypt.hash(password, 10);
    const newCobrador = await prisma.user.create({
      data: {
        nombre,
        username,
        password: hash,
        telefono: telefono || '+50600000000',
        rol: 'COBRADOR',
        prestamistaId
      }
    });

    // 3. Crear su caja de cobro
    await prisma.cajaCobrador.create({
      data: {
        cobradorId: newCobrador.id,
        saldoEfectivo: 0,
        saldoSinpe: 0,
        saldoTransferencia: 0
      }
    });

    // Auditoría
    await prisma.logActividadSaaS.create({
      data: {
        tipoEvento: 'CREAR_COBRADOR',
        descripcion: `Prestamista creó al cobrador ${username}`,
        ip: req.ip || '0.0.0.0',
        prestamistaId
      }
    });

    return res.json({ success: true, cobrador: { id: newCobrador.id, nombre: newCobrador.nombre, username: newCobrador.username } });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getCobradores(req: AuthenticatedRequest, res: Response) {
  if (req.user?.rol !== 'PRESTAMISTA') return res.status(403).json({ error: 'Denegado' });
  try {
    const cobradores = await prisma.user.findMany({
      where: { prestamistaId: req.user.id, rol: 'COBRADOR' },
      select: { id: true, nombre: true, username: true, telefono: true, createdAt: true }
    });
    return res.json(cobradores);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
