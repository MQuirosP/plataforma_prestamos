import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'caterpillar-industrial-super-secret-key';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    nombre: string;
    email: string;
    rol: 'ADMIN' | 'PRESTAMISTA';
    subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED';
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // For testing purposes, if no authorization header is sent,
  // we fallback to a default mock user (Prestamista with ACTIVE subscription)
  // so the application can be explored and tested immediately.
  if (!authHeader) {
    req.user = {
      id: 'mock-lender-id-123',
      nombre: 'Caterpillar Lender',
      email: 'lender@caterpillar-saas.com',
      rol: 'PRESTAMISTA',
      subscriptionStatus: 'ACTIVE'
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token is missing or invalid' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token is expired or invalid' });
  }
}
