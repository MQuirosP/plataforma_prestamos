import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';

export async function syncUser(req: AuthenticatedRequest, res: Response) {
  const jwtUser = req.user;
  if (!jwtUser) {
    return res.status(401).json({ error: 'Auth sync requires verified JWT user details' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (isUsingMemoryStore()) {
    let user = inMemoryStore.users.find(u => u.email === normalizedEmail);
    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      // Create memory user
      user = {
        id: providerId || `user-${Date.now()}`,
        nombre: nombre || 'Nuevo Prestamista',
        email: normalizedEmail,
        telefono: '+50600000000',
        rol: normalizedEmail.includes('admin') ? 'ADMIN' : 'PRESTAMISTA',
        createdAt: new Date()
      };
      inMemoryStore.users.push(user);

      // Create trial subscription
      inMemoryStore.subscriptions.push({
        id: `sub-${Date.now()}`,
        userId: user.id,
        tipo: 'TRIAL',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        createdAt: new Date()
      });

      // Create default settings (Costa Rica)
      inMemoryStore.settings.push({
        id: `sett-${Date.now()}`,
        userId: user.id,
        monedaSimbolo: '₡',
        monedaCodigo: 'CRC',
        nombreNegocio: 'CAT-LOAN Credit',
        plantillaWhatsapp: 'Hola {cliente}, te escribo para recordarte que tu balance pendiente es de {moneda}{saldo}. Tu cuota programada es de {moneda}{cuota}. Favor de enviar el abono a la brevedad. ¡Gracias!',
        gananciaPorcentaje: 50
      });
    }

    const sub = inMemoryStore.subscriptions.find(s => s.userId === user?.id);
    return res.json({ user, subscription: sub, isNewUser });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { subscriptions: true }
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      // Create user transactional setup
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            id: providerId || undefined,
            nombre: nombre || 'Nuevo Prestamista',
            email: normalizedEmail,
            telefono: '+50600000000',
            rol: normalizedEmail.includes('admin') ? 'ADMIN' : 'PRESTAMISTA'
          }
        });

        // Initialize subscription
        await tx.subscription.create({
          data: {
            userId: newUser.id,
            tipo: 'TRIAL',
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });

        // Initialize Costa Rica business settings
        await tx.businessSettings.create({
          data: {
            userId: newUser.id,
            monedaSimbolo: '₡',
            monedaCodigo: 'CRC',
            nombreNegocio: 'CAT-LOAN Credit',
            gananciaPorcentaje: 50
          }
        });

        return tx.user.findUnique({
          where: { id: newUser.id },
          include: { subscriptions: true }
        }) as any;
      });
    }

    const activeSub = user?.subscriptions[user.subscriptions.length - 1];

    return res.json({
      user,
      subscription: activeSub,
      isNewUser
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Auth synchronization failed', details: err.message });
  }
}
