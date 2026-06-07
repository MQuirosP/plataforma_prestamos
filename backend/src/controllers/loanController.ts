import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';
import { PlanManager } from '../services/planManager.js';

type MetodoPago = 'EFECTIVO' | 'SINPE' | 'TRANSFERENCIA';

// List all loans for the logged-in lender (or cobrador's prestamista)
export async function getLoans(req: AuthenticatedRequest, res: Response) {
  const userRole = req.user?.rol;
  let prestamistaId = req.user?.id || 'mock-lender-id-123';

  // Si es COBRADOR, usar su prestamistaId para ver los préstamos de su jefe
  if (userRole === 'COBRADOR') {
    const cobrador = isUsingMemoryStore()
      ? inMemoryStore.users.find(u => u.id === req.user?.id)
      : null;
    prestamistaId = (cobrador as any)?.prestamistaId || prestamistaId;
  }

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
      const balancePendiente = Number(loan.totalAPagar) - totalAbonado;
      const numCuotasAbonadas = Math.floor(totalAbonado / Number(loan.cuotaSemanal));
      const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));

      return {
        ...loan,
        montoOriginal: Number(loan.montoOriginal),
        totalAPagar: Number(loan.totalAPagar),
        cuotaSemanal: Number(loan.cuotaSemanal),
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
  if (userRole === 'COBRADOR') {
    return res.status(403).json({ error: 'Los cobradores no pueden crear préstamos.' });
  }

  const {
    clienteNombre, clienteTelefono, montoOriginal, cuotaSemanal, diaCobro,
    tipoIdentificacion, numeroIdentificacion
  } = req.body;

  if (!clienteNombre || !clienteTelefono || !montoOriginal || !cuotaSemanal || !diaCobro) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const parsedMonto = Number(montoOriginal);
  const parsedCuota = Number(cuotaSemanal);
  const parsedDia = Number(diaCobro);

  let gananciaPorcentaje = 50;
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

  const totalAPagar = parsedMonto * (1 + (gananciaPorcentaje / 100));

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

  // CHECK PLAN LIMITS
  const prestamistaInfo = isUsingMemoryStore()
    ? inMemoryStore.users.find(u => u.id === prestamistaId)
    : await prisma.user.findUnique({
        where: { id: prestamistaId },
        select: { plan: true }
      });

  if ((prestamistaInfo as any)?.plan && (prestamistaInfo as any).plan !== 'DIAMANTE') {
    const loanCount = isUsingMemoryStore()
      ? inMemoryStore.loans.filter(l => l.prestamistaId === prestamistaId && l.estado === 'ACTIVE').length
      : await prisma.loan.count({ where: { prestamistaId, estado: 'ACTIVE' } });
      
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
      estado: 'ACTIVE',
      fechaInicio: new Date()
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
  const metodo: MetodoPago = (['EFECTIVO', 'SINPE', 'TRANSFERENCIA'].includes(metodoPago))
    ? metodoPago as MetodoPago
    : 'EFECTIVO';
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
      return res.status(400).json({ error: `El abono supera el balance pendiente de ${balancePendiente}` });
    }

    const newPayment = {
      id: `pay-${Date.now()}`,
      loanId,
      montoAbonado: parsedMonto,
      numeroRecibo,
      notas: notas || '',
      metodoPago: metodo,
      creadoPorId: creadoPorId || null,
      fechaPago: new Date()
    };
    inMemoryStore.payments.push(newPayment as any);

    // Actualizar CajaCobrador si es COBRADOR
    if (userRole === 'COBRADOR' && creadoPorId) {
      let caja = inMemoryStore.cajas.find(c => c.cobradorId === creadoPorId);
      if (!caja) {
        caja = { id: `caja-${Date.now()}`, cobradorId: creadoPorId, saldoEfectivo: 0, saldoSinpe: 0, saldoTransferencia: 0 };
        inMemoryStore.cajas.push(caja);
      }
      if (metodo === 'EFECTIVO') caja.saldoEfectivo += parsedMonto;
      else if (metodo === 'SINPE') caja.saldoSinpe += parsedMonto;
      else if (metodo === 'TRANSFERENCIA') caja.saldoTransferencia += parsedMonto;
    }

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

      if (!loan) throw new Error('Préstamo no encontrado');

      const totalAbonado = loan.payments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);
      const balancePendiente = Number(loan.totalAPagar) - totalAbonado;

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

      if (totalAbonado + parsedMonto >= Number(loan.totalAPagar)) {
        await tx.loan.update({
          where: { id: loanId },
          data: { estado: 'PAID' }
        });
      }

      // Actualizar CajaCobrador si quien paga es COBRADOR
      if (userRole === 'COBRADOR' && creadoPorId) {
        const updateField = metodo === 'EFECTIVO'
          ? { saldoEfectivo: { increment: parsedMonto } }
          : metodo === 'SINPE'
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
