import { Router } from 'express';
import { getLoans, createLoan, addPayment, deletePayment, updateLoan, deleteLoan } from '../controllers/loanController';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { getTenants, createTenant, toggleSuspendTenant, changeTenantPlan, updateTenantPaymentDate, impersonateTenant, impersonateCobrador, getLogs, getStats, getPlanConfigs, updatePlanConfig } from '../controllers/adminController';
import { login, changePassword, refresh, logout } from '../controllers/authController';
import { getCajaCobrador, procesarLiquidacion } from '../controllers/cobradorController';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth.middleware';
import { isUsingMemoryStore, inMemoryStore, prisma } from '../services/db';
import { SubscriptionType } from '@prisma/client';

const router = Router();

// Public routes
router.post('/auth/login', login as any);
router.post('/auth/refresh', refresh as any);
router.post('/auth/logout', logout as any);

// Apply auth middleware to all routes below
router.use(authMiddleware as any);

// @ts-ignore
router.post('/auth/change-password', changePassword as any);

// Loan management
router.get('/loans', getLoans as any);
router.post('/loans', createLoan as any);
router.put('/loans/:id', updateLoan as any);
router.delete('/loans/:id', deleteLoan as any);
router.post('/loans/:id/payments', addPayment as any);
router.delete('/loans/:id/payments/:paymentId', deletePayment as any);

// Settings management
router.get('/settings', getSettings as any);
router.post('/settings', updateSettings as any);

// Admin panel endpoints
router.get('/admin/tenants', getTenants as any);
router.post('/admin/tenants', createTenant as any);
router.put('/admin/tenants/:id/suspender', toggleSuspendTenant as any);
router.put('/admin/tenants/:id/plan', changeTenantPlan as any);
router.put('/admin/tenants/:id/payment-date', updateTenantPaymentDate as any);
router.post('/admin/impersonate/:prestamistaId', impersonateTenant as any);
router.post('/admin/impersonate-cobrador/:cobradorId', impersonateCobrador as any);
router.get('/admin/logs', getLogs as any);
router.get('/admin/stats', getStats as any);
router.get('/admin/plan-configs', getPlanConfigs as any);
router.put('/admin/plan-configs', updatePlanConfig as any);

// Cobrador: caja y liquidaciones
router.get('/caja/:cobradorId', getCajaCobrador as any);
router.post('/liquidaciones/procesar', procesarLiquidacion as any);

// Prestamista: manage cobradores
import { createCobrador, getCobradores, getTenantLogs } from '../controllers/tenantController';
router.get('/cobradores', getCobradores as any);
router.post('/cobradores', createCobrador as any);
router.get('/tenant/logs', getTenantLogs as any);

// Developer Helper: Endpoint to toggle the current user's subscription status between ACTIVE and EXPIRED
// This allows the user to test the Expired Subscription View block screen on the frontend immediately.
router.post('/dev/toggle-subscription', async (req: AuthenticatedRequest, res: Response | any) => {
  const userId = req.user?.id || 'mock-lender-id-123';

  if (isUsingMemoryStore()) {
    const sub = inMemoryStore.subscriptions.find(s => s.userId === userId);
    if (sub) {
      sub.tipo = sub.tipo === SubscriptionType.ACTIVE ? SubscriptionType.EXPIRED : SubscriptionType.ACTIVE;
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
          tipo: sub.tipo === SubscriptionType.ACTIVE ? SubscriptionType.EXPIRED : SubscriptionType.ACTIVE
        }
      });
      return res.json({ success: true, newStatus: updated.tipo });
    }

    // Create a subscription if not found
    const newSub = await prisma.subscription.create({
      data: {
        userId,
        tipo: SubscriptionType.EXPIRED,
        validUntil: new Date()
      }
    });
    return res.json({ success: true, newStatus: newSub.tipo });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to toggle status', details: err.message });
  }
});

export default router;
