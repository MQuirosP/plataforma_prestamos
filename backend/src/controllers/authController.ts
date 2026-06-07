import { Request, Response } from 'express';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me';

export async function login(req: Request, res: Response) {
  let { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username y contraseña son obligatorios' });
  }

  username = username.trim().toLowerCase();
  password = password.trim();

  try {
    const user = await prisma.user.findUnique({
      where: { username },
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
    if (user.rol === 'PRESTAMISTA' && user.suspendido) {
      return res.status(403).json({ error: 'Su suscripción se encuentra suspendida. Contacte al administrador.' });
    }
    
    if (user.rol === 'COBRADOR' && user.prestamistaId) {
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
      { expiresIn: '30d' }
    );

    const activeSub = user.subscriptions[user.subscriptions.length - 1];

    return res.json({
      token,
      user,
      subscription: activeSub
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Login falló', details: err.message });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'No autorizado' });

  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'La contraseña actual y la nueva son requeridas' });
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al cambiar contraseña', details: err.message });
  }
}
