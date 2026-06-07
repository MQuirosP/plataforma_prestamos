import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../services/db';
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
    // 1. Verificar límites de plan
    const prestamistaInfo = await prisma.user.findUnique({
      where: { id: prestamistaId },
      select: { plan: true }
    });

    if (prestamistaInfo?.plan !== 'DIAMANTE') {
      const cobradorCount = await prisma.user.count({
        where: { prestamistaId, rol: 'COBRADOR' }
      });
      if (prestamistaInfo?.plan === 'BRONCE' && cobradorCount >= 1) {
        return res.status(400).json({ error: 'Límite de plan Bronce alcanzado (máximo 1 cobrador). Por favor, contacte al administrador.' });
      }
      if (prestamistaInfo?.plan === 'PLATA' && cobradorCount >= 3) {
        return res.status(400).json({ error: 'Límite de plan Plata alcanzado (máximo 3 cobradores). Por favor, contacte al administrador.' });
      }
      if (prestamistaInfo?.plan === 'ORO' && cobradorCount >= 5) {
        return res.status(400).json({ error: 'Límite de plan Oro alcanzado (máximo 5 cobradores). Por favor, contacte al administrador.' });
      }
      if (prestamistaInfo?.plan === 'PLATINO' && cobradorCount >= 10) {
        return res.status(400).json({ error: 'Límite de plan Platino alcanzado (máximo 10 cobradores). Por favor, contacte al administrador.' });
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
