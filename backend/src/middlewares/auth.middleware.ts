import { Request, Response, NextFunction } from 'express';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string; // The real database UUID
    nombre: string;
    email: string;
    rol: 'ADMIN' | 'PRESTAMISTA';
  };
}

export async function authMiddleware(req: any, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // Default fallback if no header is present
    req.user = {
      id: 'mock-lender-id-123',
      nombre: 'Juan Pérez Cobranzas',
      email: 'lender@caterpillar-saas.com',
      rol: 'PRESTAMISTA'
    };
    return next();
  }

  let token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Bearer token required' });
  }
  token = token.trim().toLowerCase();

  // If running in-memory store mode
  if (isUsingMemoryStore()) {
    let user = inMemoryStore.users.find(u => u.email === token);
    if (!user) {
      // Create user on the fly in memory
      user = {
        id: token.includes('admin') ? 'mock-admin-id-999' : `mem-user-${Date.now()}`,
        nombre: token.split('@')[0],
        email: token,
        telefono: '+50600000000',
        rol: token.includes('admin') ? 'ADMIN' : 'PRESTAMISTA',
        createdAt: new Date()
      };
      inMemoryStore.users.push(user);
    }
    req.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol
    };
    return next();
  }

  try {
    // Lookup the user in the Neon DB using their email token
    let user = await prisma.user.findUnique({
      where: { email: token }
    });

    if (!user) {
      // If the user isn't in the database yet (e.g. first sync),
      // we attach a temporary object so the sync controller can create it.
      req.user = {
        id: `temp-${Date.now()}`,
        nombre: token.split('@')[0],
        email: token,
        rol: token.includes('admin') ? 'ADMIN' : 'PRESTAMISTA'
      };
    } else {
      req.user = {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol as any
      };
    }
    
    next();
  } catch (err: any) {
    return res.status(500).json({ error: 'Auth middleware failed', details: err.message });
  }
}
