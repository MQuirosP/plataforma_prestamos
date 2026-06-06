import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'desarrollo_local_secreto_12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string; // User ID from identity provider
    nombre: string;
    email: string;
    rol: 'ADMIN' | 'PRESTAMISTA';
    subscriptionStatus?: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // Fallback mock check to keep developer workspace running easily
  if (!authHeader) {
    req.user = {
      id: 'mock-lender-id-123',
      nombre: 'Juan Pérez Cobranzas',
      email: 'lender@caterpillar-saas.com',
      rol: 'PRESTAMISTA',
      subscriptionStatus: 'ACTIVE'
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  try {
    // Standard validation
    // For Supabase/Auth0 integration: verify token against the provider public keys
    // In our case we check with the configured JWT_SECRET
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    req.user = {
      id: decoded.sub || decoded.id,
      nombre: decoded.name || decoded.nombre || 'External User',
      email: decoded.email,
      rol: decoded.rol || 'PRESTAMISTA'
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is expired or signature is invalid' });
  }
}
