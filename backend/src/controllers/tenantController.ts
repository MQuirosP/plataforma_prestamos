import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma } from '../services/db';
import { PlanManager } from '../services/planManager.js';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { logger } from '../services/logger';
import { sanitizeString, sanitizeUsername, sanitizePhone } from '../services/validation';

// Crear un nuevo cobrador bajo la cuenta del prestamista actual
export async function createCobrador(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.PRESTAMISTA) return res.status(403).json({ error: 'Denegado. Solo prestamistas pueden crear cobradores.' });
  const prestamistaId = req.user.id;
  const { nombre, username, password, telefono } = req.body;

  const cleanNombre = sanitizeString(nombre, 100);
  const cleanUsername = sanitizeUsername(username);
  const cleanTelefono = sanitizePhone(telefono);

  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'El nombre de usuario no es válido (mínimo 3 caracteres, sin espacios ni caracteres especiales).' });
  }
  if (!cleanNombre || cleanNombre.length < 2) {
    return res.status(400).json({ error: 'El nombre completo es obligatorio (mínimo 2 caracteres).' });
  }
  if (!password || password.trim().length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const prestamistaInfo = await prisma.user.findUnique({
      where: { id: prestamistaId },
      select: { plan: true }
    });

    if (prestamistaInfo?.plan && prestamistaInfo.plan !== 'DIAMANTE') {
      const cobradorCount = await prisma.user.count({
        where: { prestamistaId, rol: Role.COBRADOR }
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
        nombre: cleanNombre,
        username: cleanUsername,
        password: hash,
        telefono: cleanTelefono || '+50600000000',
        rol: Role.COBRADOR,
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
  } catch (err: any) { next(err); }
}

export async function getCobradores(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user?.rol !== Role.PRESTAMISTA) return res.status(403).json({ error: 'Denegado' });
  try {
    const cobradores = await prisma.user.findMany({
      where: { prestamistaId: req.user.id, rol: Role.COBRADOR },
      select: { id: true, nombre: true, username: true, telefono: true, createdAt: true }
    });
    return res.json(cobradores);
  } catch (err: any) { next(err); }
}
