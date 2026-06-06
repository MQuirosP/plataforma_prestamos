import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';

// List all loans for the logged-in lender
export async function getLoans(req: AuthenticatedRequest, res: Response) {
  const prestamistaId = req.user?.id || 'mock-lender-id-123';

  // Check if subscription status is EXPIRED
  // We can query user's subscription from DB or memory store
  let isExpired = false;
  if (isUsingMemoryStore()) {
    const sub = inMemoryStore.subscriptions.find(s => s.userId === prestamistaId);
    isExpired = sub?.tipo === 'EXPIRED';
  } else {
    try {
      const sub = await prisma.subscription.findFirst({
        where: { userId: prestamistaId },
        orderBy: { createdAt: 'desc' }
      });
      isExpired = sub?.tipo === 'EXPIRED';
    } catch {
      isExpired = false;
    }
  }

  if (isExpired) {
    return res.status(403).json({
      error: 'Subscription expired',
      expired: true,
      message: 'Su suscripción ha expirado. Por favor, contacte al administrador.'
    });
  }

  if (isUsingMemoryStore()) {
    const loans = inMemoryStore.loans.filter(l => l.prestamistaId === prestamistaId);
    const loansWithBalance = loans.map(loan => {
      const payments = inMemoryStore.payments.filter(p => p.loanId === loan.id);
      const totalAbonado = payments.reduce((sum, p) => sum + p.montoAbonado, 0);
      const balancePendiente = Number(loan.totalAPagar) - totalAbonado;
      const numCuotasAbonadas = Math.floor(totalAbonado / Number(loan.cuotaSemanal));
      const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));
      
      return {
        ...loan,
        montoOriginal: Number(loan.montoOriginal),
        totalAPagar: Number(loan.totalAPagar),
        cuotaSemanal: Number(loan.cuotaSemanal),
        balancePendiente,
        cuotaActual: Math.min(numCuotasAbonadas + 1, totalCuotasEstimadas),
        cuotasTotales: totalCuotasEstimadas,
        payments
      };
    });
    return res.json(loansWithBalance);
  }

  try {
    const loans = await prisma.loan.findMany({
      where: { prestamistaId },
      include: { payments: true }
    });

    const loansWithBalance = loans.map(loan => {
      const totalAbonado = loan.payments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);
      const balancePendiente = Number(loan.totalAPagar) - totalAbonado;
      const numCuotasAbonadas = Math.floor(totalAbonado / Number(loan.cuotaSemanal));
      const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));

      return {
        ...loan,
        montoOriginal: Number(loan.montoOriginal),
        totalAPagar: Number(loan.totalAPagar),
        cuotaSemanal: Number(loan.cuotaSemanal),
        balancePendiente,
        cuotaActual: Math.min(numCuotasAbonadas + 1, totalCuotasEstimadas),
        cuotasTotales: totalCuotasEstimadas,
        payments: loan.payments.map(p => ({
          ...p,
          montoAbonado: Number(p.montoAbonado)
        }))
      };
    });

    return res.json(loansWithBalance);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch loans', details: err.message });
  }
}

// Create a new loan
export async function createLoan(req: AuthenticatedRequest, res: Response) {
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  const { clienteNombre, clienteTelefono, montoOriginal, cuotaSemanal, diaCobro } = req.body;

  if (!clienteNombre || !clienteTelefono || !montoOriginal || !cuotaSemanal || !diaCobro) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const parsedMonto = Number(montoOriginal);
  const parsedCuota = Number(cuotaSemanal);
  const parsedDia = Number(diaCobro);
  const totalAPagar = parsedMonto * 1.5; // 1.50 multiplier logic

  // Check if subscription status is EXPIRED
  let isExpired = false;
  if (isUsingMemoryStore()) {
    const sub = inMemoryStore.subscriptions.find(s => s.userId === prestamistaId);
    isExpired = sub?.tipo === 'EXPIRED';
  } else {
    try {
      const sub = await prisma.subscription.findFirst({
        where: { userId: prestamistaId },
        orderBy: { createdAt: 'desc' }
      });
      isExpired = sub?.tipo === 'EXPIRED';
    } catch {
      isExpired = false;
    }
  }

  if (isExpired) {
    return res.status(403).json({
      error: 'Subscription expired',
      expired: true,
      message: 'Su suscripción ha expirado. Por favor, contacte al administrador.'
    });
  }

  if (isUsingMemoryStore()) {
    const newLoan: any = {
      id: `loan-${Date.now()}`,
      prestamistaId,
      clienteNombre,
      clienteTelefono,
      montoOriginal: parsedMonto,
      totalAPagar,
      cuotaSemanal: parsedCuota,
      diaCobro: parsedDia,
      estado: 'ACTIVE',
      fechaInicio: new Date()
    };
    inMemoryStore.loans.push(newLoan);
    return res.status(211).json({ ...newLoan, balancePendiente: totalAPagar, payments: [] });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          prestamistaId,
          clienteNombre,
          clienteTelefono,
          montoOriginal: parsedMonto,
          totalAPagar,
          cuotaSemanal: parsedCuota,
          diaCobro: parsedDia,
          estado: 'ACTIVE'
        }
      });
      return loan;
    });

    return res.status(201).json({
      ...result,
      montoOriginal: Number(result.montoOriginal),
      totalAPagar: Number(result.totalAPagar),
      cuotaSemanal: Number(result.cuotaSemanal),
      balancePendiente: Number(result.totalAPagar),
      payments: []
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create loan', details: err.message });
  }
}

// Make a payment/abono
export async function addPayment(req: AuthenticatedRequest, res: Response) {
  const { id: loanId } = req.params;
  const { montoAbonado, notas } = req.body;

  if (!montoAbonado || Number(montoAbonado) <= 0) {
    return res.status(400).json({ error: 'Monto abonado debe ser mayor a 0' });
  }

  const parsedMonto = Number(montoAbonado);
  const numeroRecibo = `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  if (isUsingMemoryStore()) {
    const loan = inMemoryStore.loans.find(l => l.id === loanId);
    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    const payments = inMemoryStore.payments.filter(p => p.loanId === loanId);
    const totalAbonado = payments.reduce((sum, p) => sum + p.montoAbonado, 0);
    const balancePendiente = Number(loan.totalAPagar) - totalAbonado;

    if (parsedMonto > balancePendiente) {
      return res.status(400).json({ error: `El abono supera el balance pendiente de $${balancePendiente}` });
    }

    const newPayment = {
      id: `pay-${Date.now()}`,
      loanId,
      montoAbonado: parsedMonto,
      numeroRecibo,
      notas: notas || '',
      fechaPago: new Date()
    };
    inMemoryStore.payments.push(newPayment);

    // If fully paid, change status
    const newTotalAbonado = totalAbonado + parsedMonto;
    if (newTotalAbonado >= Number(loan.totalAPagar)) {
      loan.estado = 'PAID';
    }

    return res.status(201).json(newPayment);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { payments: true }
      });

      if (!loan) {
        throw new Error('Préstamo no encontrado');
      }

      const totalAbonado = loan.payments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);
      const balancePendiente = Number(loan.totalAPagar) - totalAbonado;

      if (parsedMonto > balancePendiente) {
        throw new Error(`El abono supera el balance pendiente de $${balancePendiente}`);
      }

      const payment = await tx.payment.create({
        data: {
          loanId,
          montoAbonado: parsedMonto,
          numeroRecibo,
          notas
        }
      });

      if (totalAbonado + parsedMonto >= Number(loan.totalAPagar)) {
        await tx.loan.update({
          where: { id: loanId },
          data: { estado: 'PAID' }
        });
      }

      return payment;
    });

    return res.status(201).json({
      ...result,
      montoAbonado: Number(result.montoAbonado)
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to apply payment' });
  }
}
