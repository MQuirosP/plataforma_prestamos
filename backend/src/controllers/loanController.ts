import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';
import { PlanManager } from '../services/planManager.js';
import { Role, SubscriptionType, MetodoPago, LoanStatus, FineFrequency } from '@prisma/client';
import { updatePenaltiesForTenant } from '../services/fineService';


// List all loans for the logged-in lender (or cobrador's prestamista)
export async function getLoans(req: AuthenticatedRequest, res: Response) {
  const userRole = req.user?.rol;
  let prestamistaId = req.user?.id || 'mock-lender-id-123';

  // Si es COBRADOR, usar su prestamistaId para ver los préstamos de su jefe
  if (userRole === Role.COBRADOR) {
    if (isUsingMemoryStore()) {
      const cobrador = inMemoryStore.users.find(u => u.id === req.user?.id);
      prestamistaId = (cobrador as any)?.prestamistaId || prestamistaId;
    } else {
      const cobrador = await prisma.user.findUnique({
        where: { id: req.user?.id },
        select: { prestamistaId: true }
      });
      prestamistaId = cobrador?.prestamistaId || prestamistaId;
    }
  }

  // Update penalties dynamically before fetching
  await updatePenaltiesForTenant(prestamistaId);

  let isExpired = false;
  if (isUsingMemoryStore()) {
    const sub = inMemoryStore.subscriptions.find(s => s.userId === prestamistaId);
    isExpired = sub?.tipo === SubscriptionType.EXPIRED;
  } else {
    try {
      const sub = await prisma.subscription.findFirst({
        where: { userId: prestamistaId },
        orderBy: { createdAt: 'desc' }
      });
      isExpired = sub?.tipo === SubscriptionType.EXPIRED;
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
      const balancePendiente = Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0) - totalAbonado;
      const numCuotasAbonadas = Math.floor(totalAbonado / Number(loan.cuotaSemanal));
      const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));

      return {
        ...loan,
        montoOriginal: Number(loan.montoOriginal),
        totalAPagar: Number(loan.totalAPagar),
        cuotaSemanal: Number(loan.cuotaSemanal),
        fineAmount: loan.fineAmount ? Number(loan.fineAmount) : null,
        fineFrequency: loan.fineFrequency,
        graceDays: Number(loan.graceDays),
        multasAcumuladas: Number(loan.multasAcumuladas || 0),
        balancePendiente,
        cuotaActual: Math.min(numCuotasAbonadas, totalCuotasEstimadas),
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
      const balancePendiente = Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0) - totalAbonado;
      const numCuotasAbonadas = Math.floor(totalAbonado / Number(loan.cuotaSemanal));
      const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));

      return {
        ...loan,
        montoOriginal: Number(loan.montoOriginal),
        totalAPagar: Number(loan.totalAPagar),
        cuotaSemanal: Number(loan.cuotaSemanal),
        fineAmount: loan.fineAmount ? Number(loan.fineAmount) : null,
        fineFrequency: loan.fineFrequency,
        graceDays: Number(loan.graceDays),
        multasAcumuladas: Number(loan.multasAcumuladas || 0),
        balancePendiente,
        cuotaActual: Math.min(numCuotasAbonadas, totalCuotasEstimadas),
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
  const userRole = req.user?.rol;

  // COBRADOR no puede crear préstamos
  if (userRole === Role.COBRADOR) {
    return res.status(403).json({ error: 'Los cobradores no pueden crear préstamos.' });
  }

  const {
    clienteNombre, clienteTelefono, montoOriginal, cuotaSemanal, diaCobro,
    tipoIdentificacion, numeroIdentificacion, porcentaje,
    fineAmount, fineFrequency, graceDays, totalAPagarDirect
  } = req.body;

  if (!clienteNombre || !clienteTelefono || !montoOriginal || !cuotaSemanal || !diaCobro) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const parsedMonto = Number(montoOriginal);
  const parsedCuota = Number(cuotaSemanal);
  const parsedDia = Number(diaCobro);

  let totalAPagar: number;
  if (totalAPagarDirect !== undefined && totalAPagarDirect !== null) {
    totalAPagar = Number(totalAPagarDirect);
  } else {
    let gananciaPorcentaje = 50;
    if (porcentaje !== undefined && porcentaje !== null) {
      gananciaPorcentaje = Number(porcentaje);
    } else {
      if (isUsingMemoryStore()) {
        const sett = inMemoryStore.settings.find(s => s.userId === prestamistaId);
        if (sett) gananciaPorcentaje = sett.gananciaPorcentaje;
      } else {
        try {
          const sett = await prisma.businessSettings.findUnique({ where: { userId: prestamistaId } });
          if (sett) gananciaPorcentaje = sett.gananciaPorcentaje;
        } catch {
          gananciaPorcentaje = 50;
        }
      }
    }
    totalAPagar = parsedMonto * (1 + (gananciaPorcentaje / 100));
  }

  let isExpired = false;
  if (isUsingMemoryStore()) {
    const sub = inMemoryStore.subscriptions.find(s => s.userId === prestamistaId);
    isExpired = sub?.tipo === SubscriptionType.EXPIRED;
  } else {
    try {
      const sub = await prisma.subscription.findFirst({
        where: { userId: prestamistaId },
        orderBy: { createdAt: 'desc' }
      });
      isExpired = sub?.tipo === SubscriptionType.EXPIRED;
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

  // CHECK PLAN LIMITS
  const prestamistaInfo = isUsingMemoryStore()
    ? inMemoryStore.users.find(u => u.id === prestamistaId)
    : await prisma.user.findUnique({
        where: { id: prestamistaId },
        select: { plan: true }
      });

  if ((prestamistaInfo as any)?.plan && (prestamistaInfo as any).plan !== 'DIAMANTE') {
    const loanCount = isUsingMemoryStore()
      ? inMemoryStore.loans.filter(l => l.prestamistaId === prestamistaId && l.estado === LoanStatus.ACTIVE).length
      : await prisma.loan.count({ where: { prestamistaId, estado: LoanStatus.ACTIVE } });
      
    const planConfig = await PlanManager.getPlanConfig((prestamistaInfo as any).plan as any);

    if (planConfig.maxClientes !== -1 && loanCount >= planConfig.maxClientes) {
      return res.status(403).json({ 
        error: `Límite de plan ${(prestamistaInfo as any).plan} alcanzado (máximo ${planConfig.maxClientes} clientes). Por favor, suba de categoría.` 
      });
    }
  }

  if (isUsingMemoryStore()) {
    const newLoan: any = {
      id: `loan-${Date.now()}`,
      prestamistaId,
      clienteNombre,
      clienteTelefono,
      tipoIdentificacion: tipoIdentificacion || 'CEDULA_NACIONAL',
      numeroIdentificacion: numeroIdentificacion || null,
      montoOriginal: parsedMonto,
      totalAPagar,
      cuotaSemanal: parsedCuota,
      diaCobro: parsedDia,
      estado: LoanStatus.ACTIVE,
      fechaInicio: new Date(),
      fineAmount: fineAmount ? Number(fineAmount) : null,
      fineFrequency: fineFrequency || null,
      graceDays: graceDays ? Number(graceDays) : 0,
      multasAcumuladas: 0
    };
    inMemoryStore.loans.push(newLoan);
    return res.status(201).json({ ...newLoan, balancePendiente: totalAPagar, payments: [] });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          prestamistaId,
          clienteNombre,
          clienteTelefono,
          tipoIdentificacion: tipoIdentificacion || 'CEDULA_NACIONAL',
          numeroIdentificacion: numeroIdentificacion || null,
          montoOriginal: parsedMonto,
          totalAPagar,
          cuotaSemanal: parsedCuota,
          diaCobro: parsedDia,
          estado: LoanStatus.ACTIVE,
          fineAmount: fineAmount ? Number(fineAmount) : null,
          fineFrequency: fineFrequency || null,
          graceDays: graceDays ? Number(graceDays) : 0,
          multasAcumuladas: 0
        }
      });
      return loan;
    });

    return res.status(201).json({
      ...result,
      montoOriginal: Number(result.montoOriginal),
      totalAPagar: Number(result.totalAPagar),
      cuotaSemanal: Number(result.cuotaSemanal),
      fineAmount: result.fineAmount ? Number(result.fineAmount) : null,
      fineFrequency: result.fineFrequency,
      graceDays: Number(result.graceDays),
      multasAcumuladas: Number(result.multasAcumuladas || 0),
      balancePendiente: Number(result.totalAPagar),
      payments: []
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create loan', details: err.message });
  }
}

// Make a payment/abono (with método de pago and CajaCobrador update)
export async function addPayment(req: AuthenticatedRequest, res: Response) {
  const { id: loanId } = req.params;
  const { montoAbonado, notas, metodoPago } = req.body;
  const creadoPorId = req.user?.id;
  const userRole = req.user?.rol;

  if (!montoAbonado || Number(montoAbonado) <= 0) {
    return res.status(400).json({ error: 'Monto abonado debe ser mayor a 0' });
  }

  const parsedMonto = Number(montoAbonado);
  const metodo: MetodoPago = ([MetodoPago.EFECTIVO, MetodoPago.SINPE, MetodoPago.TRANSFERENCIA].includes(metodoPago as MetodoPago))
    ? metodoPago as MetodoPago
    : MetodoPago.EFECTIVO;
  const numeroRecibo = `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  if (isUsingMemoryStore()) {
    const loan = inMemoryStore.loans.find(l => l.id === loanId);
    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    const payments = inMemoryStore.payments.filter(p => p.loanId === loanId);
    const totalAbonado = payments.reduce((sum, p) => sum + p.montoAbonado, 0);
    const balancePendiente = Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0) - totalAbonado;

    if (parsedMonto > balancePendiente) {
      return res.status(400).json({ error: `El abono supera el balance pendiente de ${balancePendiente}` });
    }

    const newPayment = {
      id: `pay-${Date.now()}`,
      loanId,
      montoAbonado: parsedMonto,
      numeroRecibo,
      notes: notas || '',
      metodoPago: metodo,
      creadoPorId: creadoPorId || null,
      fechaPago: new Date()
    };
    inMemoryStore.payments.push(newPayment as any);

    // Actualizar CajaCobrador si es COBRADOR
    if (userRole === Role.COBRADOR && creadoPorId) {
      let caja = inMemoryStore.cajas.find(c => c.cobradorId === creadoPorId);
      if (!caja) {
        caja = { id: `caja-${Date.now()}`, cobradorId: creadoPorId, saldoEfectivo: 0, saldoSinpe: 0, saldoTransferencia: 0 };
        inMemoryStore.cajas.push(caja);
      }
      if (metodo === MetodoPago.EFECTIVO) caja.saldoEfectivo += parsedMonto;
      else if (metodo === MetodoPago.SINPE) caja.saldoSinpe += parsedMonto;
      else if (metodo === MetodoPago.TRANSFERENCIA) caja.saldoTransferencia += parsedMonto;
    }

    const newTotalAbonado = totalAbonado + parsedMonto;
    if (newTotalAbonado >= Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0)) {
      loan.estado = LoanStatus.PAID;
    }

    return res.status(201).json(newPayment);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { payments: true }
      });

      if (!loan) throw new Error('Préstamo no encontrado');

      const totalAbonado = loan.payments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);
      const balancePendiente = Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0) - totalAbonado;

      if (parsedMonto > balancePendiente) {
        throw new Error(`El abono supera el balance pendiente de ${balancePendiente}`);
      }

      const payment = await tx.payment.create({
        data: {
          loanId,
          montoAbonado: parsedMonto,
          numeroRecibo,
          notas,
          metodoPago: metodo,
          creadoPorId: creadoPorId || null
        }
      });

      if (totalAbonado + parsedMonto >= Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0)) {
        await tx.loan.update({
          where: { id: loanId },
          data: { estado: LoanStatus.PAID }
        });
      }

      // Actualizar CajaCobrador si quien paga es COBRADOR
      if (userRole === Role.COBRADOR && creadoPorId) {
        const updateField = metodo === MetodoPago.EFECTIVO
          ? { saldoEfectivo: { increment: parsedMonto } }
          : metodo === MetodoPago.SINPE
            ? { saldoSinpe: { increment: parsedMonto } }
            : { saldoTransferencia: { increment: parsedMonto } };

        const existingCaja = await tx.cajaCobrador.findUnique({
          where: { cobradorId: creadoPorId }
        });

        if (existingCaja) {
          await tx.cajaCobrador.update({
            where: { cobradorId: creadoPorId },
            data: updateField
          });
        } else {
          await tx.cajaCobrador.create({
            data: {
              cobradorId: creadoPorId,
              saldoEfectivo: metodo === 'EFECTIVO' ? parsedMonto : 0,
              saldoSinpe: metodo === 'SINPE' ? parsedMonto : 0,
              saldoTransferencia: metodo === 'TRANSFERENCIA' ? parsedMonto : 0
            }
          });
        }
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

// Delete/void a payment (Restricted: COBRADOR cannot do this)
export async function deletePayment(req: AuthenticatedRequest, res: Response) {
  const { id: loanId, paymentId } = req.params;
  const userRole = req.user?.rol;

  if (userRole === Role.COBRADOR) {
    return res.status(403).json({ error: 'Los cobradores no pueden eliminar pagos.' });
  }

  if (isUsingMemoryStore()) {
    const loan = inMemoryStore.loans.find(l => l.id === loanId);
    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    const payIdx = inMemoryStore.payments.findIndex(p => p.id === paymentId && p.loanId === loanId);
    if (payIdx === -1) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }

    const payment = inMemoryStore.payments[payIdx];
    inMemoryStore.payments.splice(payIdx, 1);

    // Ajustar CajaCobrador si el creador es COBRADOR
    if (payment.creadoPorId) {
      const creator = inMemoryStore.users.find(u => u.id === payment.creadoPorId);
      if (creator && creator.rol === Role.COBRADOR) {
        const caja = inMemoryStore.cajas.find(c => c.cobradorId === payment.creadoPorId);
        if (caja) {
          if (payment.metodoPago === MetodoPago.EFECTIVO) caja.saldoEfectivo -= payment.montoAbonado;
          else if (payment.metodoPago === MetodoPago.SINPE) caja.saldoSinpe -= payment.montoAbonado;
          else if (payment.metodoPago === MetodoPago.TRANSFERENCIA) caja.saldoTransferencia -= payment.montoAbonado;
        }
      }
    }

    // Asegurar que el préstamo vuelve a estar activo al remover el abono
    loan.estado = LoanStatus.ACTIVE;

    return res.json({ success: true, message: 'Pago eliminado correctamente' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId }
      });

      if (!payment || payment.loanId !== loanId) {
        throw new Error('Pago no encontrado');
      }

      await tx.payment.delete({
        where: { id: paymentId }
      });

      // Poner el préstamo en ACTIVE
      await tx.loan.update({
        where: { id: loanId },
        data: { estado: LoanStatus.ACTIVE }
      });

      // Si fue creado por un cobrador, restar de su CajaCobrador
      if (payment.creadoPorId) {
        const creator = await tx.user.findUnique({
          where: { id: payment.creadoPorId },
          select: { rol: true }
        });

        if (creator && creator.rol === Role.COBRADOR) {
          const amount = Number(payment.montoAbonado);
          const updateField = payment.metodoPago === MetodoPago.EFECTIVO
            ? { saldoEfectivo: { decrement: amount } }
            : payment.metodoPago === MetodoPago.SINPE
              ? { saldoSinpe: { decrement: amount } }
              : { saldoTransferencia: { decrement: amount } };

          const caja = await tx.cajaCobrador.findUnique({
            where: { cobradorId: payment.creadoPorId }
          });

          if (caja) {
            await tx.cajaCobrador.update({
              where: { cobradorId: payment.creadoPorId },
              data: updateField
            });
          }
        }
      }

      return payment;
    });

    return res.json({ success: true, message: 'Pago eliminado correctamente', payment: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete payment' });
  }
}
