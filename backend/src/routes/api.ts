import { Router } from 'express';
import { getLoans, createLoan, addPayment } from '../controllers/loanController';
import { getExpiringSubscribers } from '../controllers/adminController';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { isUsingMemoryStore, inMemoryStore, prisma } from '../services/db';

const router = Router();

// Apply auth middleware to all routes below
router.use(authMiddleware);

// Loan management
router.get('/loans', getLoans);
router.post('/loans', createLoan);
router.post('/loans/:id/payments', addPayment);

// Admin analytics
router.get('/admin/expiring-subscriptions', getExpiringSubscribers);

// Developer Helper: Endpoint to toggle the current user's subscription status between ACTIVE and EXPIRED
// This allows the user to test the Expired Subscription View block screen on the frontend immediately.
router.post('/dev/toggle-subscription', async (req: AuthenticatedRequest, res: Response | any) => {
  const userId = req.user?.id || 'mock-lender-id-123';

  if (isUsingMemoryStore()) {
    const sub = inMemoryStore.subscriptions.find(s => s.userId === userId);
    if (sub) {
      sub.tipo = sub.tipo === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE';
      return res.json({ success: true, newStatus: sub.tipo });
    }
    return res.status(404).json({ error: 'Subscription not found' });
  }

  try {
    const sub = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (sub) {
      const updated = await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          tipo: sub.tipo === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE'
        }
      });
      return res.json({ success: true, newStatus: updated.tipo });
    }

    // Create a subscription if not found
    const newSub = await prisma.subscription.create({
      data: {
        userId,
        tipo: 'EXPIRED',
        validUntil: new Date()
      }
    });
    return res.json({ success: true, newStatus: newSub.tipo });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to toggle status', details: err.message });
  }
});

export default router;
