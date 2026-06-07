import { Request, Response } from 'express';
import { prisma } from '../services/db';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me';

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username y contraseña son obligatorios' });
  }

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
