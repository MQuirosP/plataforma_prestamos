import { Request, Response, NextFunction } from 'express';
import { prisma, isUsingMemoryStore } from '../services/db';
import * as jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    nombre: string;
    email?: string;
    rol: 'ADMIN' | 'PRESTAMISTA' | 'COBRADOR';
    prestamistaId?: string;
    isImpersonating?: boolean;
    originalRol?: 'ADMIN' | 'PRESTAMISTA' | 'COBRADOR';
    adminId?: string;
  };
}

export async function authMiddleware(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Bearer token required' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Bearer token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Si estamos en memoria ignoramos la DB
    if (isUsingMemoryStore()) {
      req.user = decoded;
      return next();
    }

    // Verificar estado de suspensión en la DB real (Kill Switch)
    const userDb = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!userDb) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (userDb.rol === Role.PRESTAMISTA && userDb.suspendido) {
      return res.status(403).json({ error: 'Su suscripción se encuentra suspendida. Contacte al administrador.' });
    }

    if (userDb.rol === Role.COBRADOR && userDb.prestamistaId) {
      const prestamistaDb = await prisma.user.findUnique({
        where: { id: userDb.prestamistaId }
      });
      if (prestamistaDb?.suspendido) {
        return res.status(403).json({ error: 'La suscripción de su administrador se encuentra suspendida.' });
      }
    }

    req.user = {
      ...decoded,
      rol: userDb.rol // Priorizamos el rol de la base de datos por si cambió
    };
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}
