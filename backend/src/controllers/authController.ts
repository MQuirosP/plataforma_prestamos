import { Request, Response, NextFunction } from 'express';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import { logger } from '../services/logger';
import { sanitizeUsername } from '../services/validation';

function parseCookies(req: Request): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('='));
    }
  });
  return list;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7');

export async function login(req: Request, res: Response, next: NextFunction) {
  let { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username y contraseña son obligatorios' });
  }

  const cleanUsername = sanitizeUsername(username);
  if (!cleanUsername) {
    return res.status(400).json({ error: 'Username inválido' });
  }

  password = password.trim();

  try {
    const user = await prisma.user.findUnique({
      where: { username: cleanUsername },
      include: { subscriptions: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Si es prestamista o cobrador, verificar suspensión
    if (user.rol === Role.PRESTAMISTA && user.suspendido) {
      return res.status(403).json({ error: 'Su suscripción se encuentra suspendida. Contacte al administrador.' });
    }
    
    if (user.rol === Role.COBRADOR && user.prestamistaId) {
      const prestamista = await prisma.user.findUnique({ where: { id: user.prestamistaId } });
      if (prestamista?.suspendido) {
        return res.status(403).json({ error: 'La suscripción de su administrador se encuentra suspendida.' });
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        prestamistaId: user.prestamistaId
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY as any }
    );

    const refreshRaw = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    if (isUsingMemoryStore()) {
      inMemoryStore.refreshTokens.push({
        id: Math.random().toString(),
        token: refreshRaw,
        userId: user.id,
        expiresAt,
        createdAt: new Date()
      });
    } else {
      await prisma.refreshToken.create({
        data: {
          token: refreshRaw,
          userId: user.id,
          expiresAt
        }
      });
    }

    res.cookie('refresh_token', refreshRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt
    });

    const activeSub = user.subscriptions[user.subscriptions.length - 1];

    return res.json({
      token,
      user,
      subscription: activeSub
    });
  } catch (err: any) { next(err); }
}

export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No autorizado' });

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'La contraseña actual y la nueva son requeridas' });
  }

  if (newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    if (isUsingMemoryStore()) {
      const user = inMemoryStore.users.find(u => u.id === userId);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

      const valid = await bcrypt.compare(oldPassword.trim(), (user as any).password);
      if (!valid) {
        return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
      }

      const hash = await bcrypt.hash(newPassword.trim(), 10);
      (user as any).password = hash;
      return res.json({ success: true, message: 'Contraseña cambiada exitosamente' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const valid = await bcrypt.compare(oldPassword.trim(), user.password);
    if (!valid) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    const hash = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hash }
    });

    return res.json({ success: true, message: 'Contraseña cambiada exitosamente' });
  } catch (err: any) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req);
  const refreshToken = cookies['refresh_token'];

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token missing' });
  }

  try {
    let tokenDb: any = null;

    if (isUsingMemoryStore()) {
      tokenDb = inMemoryStore.refreshTokens.find(t => t.token === refreshToken);
    } else {
      tokenDb = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: { include: { subscriptions: true } } }
      });
    }

    if (!tokenDb || new Date() > new Date(tokenDb.expiresAt)) {
      if (tokenDb) {
        if (isUsingMemoryStore()) {
          inMemoryStore.refreshTokens = inMemoryStore.refreshTokens.filter(t => t.id !== tokenDb.id);
        } else {
          await prisma.refreshToken.delete({ where: { id: tokenDb.id } }).catch(() => {});
        }
      }
      return res.status(401).json({ error: 'Refresh token expired or invalid' });
    }

    // Rotate Refresh Token
    if (isUsingMemoryStore()) {
      inMemoryStore.refreshTokens = inMemoryStore.refreshTokens.filter(t => t.id !== tokenDb.id);
    } else {
      await prisma.refreshToken.delete({ where: { id: tokenDb.id } });
    }

    let user: any = null;
    if (isUsingMemoryStore()) {
      user = inMemoryStore.users.find(u => u.id === tokenDb.userId);
    } else {
      user = tokenDb.user;
    }

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    if (user.rol === Role.PRESTAMISTA && user.suspendido) {
      return res.status(403).json({ error: 'Su suscripción se encuentra suspendida. Contacte al administrador.' });
    }

    if (user.rol === Role.COBRADOR && user.prestamistaId) {
      let prestamista: any = null;
      if (isUsingMemoryStore()) {
        prestamista = inMemoryStore.users.find(u => u.id === user.prestamistaId);
      } else {
        prestamista = await prisma.user.findUnique({ where: { id: user.prestamistaId } });
      }
      if (prestamista?.suspendido) {
        return res.status(403).json({ error: 'La suscripción de su administrador se encuentra suspendida.' });
      }
    }

    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        rol: user.rol,
        prestamistaId: user.prestamistaId
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY as any }
    );

    const newRefreshRaw = crypto.randomBytes(40).toString('hex');
    const newExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    if (isUsingMemoryStore()) {
      inMemoryStore.refreshTokens.push({
        id: Math.random().toString(),
        token: newRefreshRaw,
        userId: user.id,
        expiresAt: newExpiresAt,
        createdAt: new Date()
      });
    } else {
      await prisma.refreshToken.create({
        data: {
          token: newRefreshRaw,
          userId: user.id,
          expiresAt: newExpiresAt
        }
      });
    }

    res.cookie('refresh_token', newRefreshRaw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: newExpiresAt
    });

    const activeSub = user.subscriptions ? user.subscriptions[user.subscriptions.length - 1] : null;

    return res.json({
      token: newAccessToken,
      user,
      subscription: activeSub
    });
  } catch (err: any) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  const cookies = parseCookies(req);
  const refreshToken = cookies['refresh_token'];

  if (refreshToken) {
    if (isUsingMemoryStore()) {
      inMemoryStore.refreshTokens = inMemoryStore.refreshTokens.filter(t => t.token !== refreshToken);
    } else {
      try {
        await prisma.refreshToken.deleteMany({
          where: { token: refreshToken }
        });
      } catch (err) {
        logger.warn({ err }, 'Failed to revoke refresh token from DB');
      }
    }
  }

  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  return res.json({ success: true });
}
