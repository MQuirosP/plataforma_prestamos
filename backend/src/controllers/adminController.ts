import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';

export async function getExpiringSubscribers(req: AuthenticatedRequest, res: Response) {
  // Ensure requesting user is ADMIN
  const requestorRole = req.user?.rol || 'ADMIN'; // fallback to ADMIN for developer testing
  if (requestorRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + 5); // 5 days from now

  if (isUsingMemoryStore()) {
    // Filter expiring subscriptions
    const expiringSubscriptions = inMemoryStore.subscriptions.filter(sub => {
      const expiration = new Date(sub.validUntil);
      // Diff in days
      const diffTime = expiration.getTime() - Date.now();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Expiring in 5 days or less (including already expired, to review renewals)
      return diffDays <= 5;
    });

    const result = expiringSubscriptions.map(sub => {
      const user = inMemoryStore.users.find(u => u.id === sub.userId);
      const expiration = new Date(sub.validUntil);
      const diffTime = expiration.getTime() - Date.now();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        userId: user?.id,
        nombre: user?.nombre,
        email: user?.email,
        telefono: user?.telefono,
        subscriptionType: sub.tipo,
        validUntil: sub.validUntil,
        diasRestantes
      };
    });

    return res.json(result);
  }

  try {
    // Find subscriptions where validUntil is less than or equal to limitDate
    const subscriptions = await prisma.subscription.findMany({
      where: {
        validUntil: {
          lte: limitDate
        }
      },
      include: {
        user: true
      },
      orderBy: {
        validUntil: 'asc'
      }
    });

    const result = subscriptions.map(sub => {
      const expiration = new Date(sub.validUntil);
      const diffTime = expiration.getTime() - Date.now();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        userId: sub.userId,
        nombre: sub.user.nombre,
        email: sub.user.email,
        telefono: sub.user.telefono,
        subscriptionType: sub.tipo,
        validUntil: sub.validUntil,
        diasRestantes
      };
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch analytics', details: err.message });
  }
}

export async function getAllSubscribers(req: AuthenticatedRequest, res: Response) {
  // Ensure requesting user is ADMIN
  const requestorRole = req.user?.rol;
  if (requestorRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  if (isUsingMemoryStore()) {
    const result = inMemoryStore.users
      .filter(u => u.rol !== 'ADMIN')
      .map(user => {
        const sub = inMemoryStore.subscriptions.find(s => s.userId === user.id);
        const validUntil = sub ? sub.validUntil : new Date();
        const expiration = new Date(validUntil);
        const diffTime = expiration.getTime() - Date.now();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          userId: user.id,
          nombre: user.nombre,
          email: user.email,
          telefono: user.telefono,
          subscriptionType: sub ? sub.tipo : 'EXPIRED',
          validUntil: validUntil,
          diasRestantes
        };
      });

    return res.json(result);
  }

  try {
    const users = await prisma.user.findMany({
      where: {
        rol: 'PRESTAMISTA'
      },
      include: {
        subscriptions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const result = users.map(user => {
      const sub = user.subscriptions[0];
      const validUntil = sub ? sub.validUntil : new Date();
      const expiration = new Date(validUntil);
      const diffTime = expiration.getTime() - Date.now();
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        userId: user.id,
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        subscriptionType: sub ? sub.tipo : 'EXPIRED',
        validUntil: validUntil,
        diasRestantes
      };
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch subscribers', details: err.message });
  }
}

export async function renewUserSubscription(req: AuthenticatedRequest, res: Response) {
  // Ensure requesting user is ADMIN
  const requestorRole = req.user?.rol;
  if (requestorRole !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  const { userId, days } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const daysToExtend = typeof days !== 'undefined' && days !== null ? Number(days) : 30;
  const status = daysToExtend > 0 ? 'ACTIVE' : 'EXPIRED';
  const validUntil = new Date();
  if (daysToExtend > 0) {
    validUntil.setDate(validUntil.getDate() + daysToExtend);
  } else {
    validUntil.setMinutes(validUntil.getMinutes() - 1); // 1 minute in the past
  }

  if (isUsingMemoryStore()) {
    let sub = inMemoryStore.subscriptions.find(s => s.userId === userId);
    if (sub) {
      sub.tipo = status;
      sub.validUntil = validUntil;
    } else {
      sub = {
        id: `mem-sub-${Date.now()}`,
        userId,
        tipo: status,
        validUntil,
        createdAt: new Date()
      };
      inMemoryStore.subscriptions.push(sub);
    }
    return res.json({ success: true, validUntil, tipo: status });
  }

  try {
    await prisma.subscription.deleteMany({
      where: { userId }
    });

    const newSub = await prisma.subscription.create({
      data: {
        userId,
        tipo: status,
        validUntil
      }
    });

    return res.json({ success: true, validUntil: newSub.validUntil, tipo: newSub.tipo });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to renew subscription', details: err.message });
  }
}
