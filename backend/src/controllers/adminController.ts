import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
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
