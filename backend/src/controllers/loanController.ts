import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { prisma, isUsingMemoryStore, inMemoryStore } from '../services/db';
import { PlanManager } from '../services/planManager.js';
import { Role, SubscriptionType, MetodoPago, LoanStatus, FineFrequency, TipoIdentificacion, LoanModalidad, LoanFrecuencia, PaymentTipo } from '@prisma/client';
import { updatePenaltiesForTenant } from '../services/fineService';
import { logger } from '../services/logger';
import { sanitizeString, sanitizePhone, validatePositiveNumber, validateIntegerRange } from '../services/validation';
import { logActivity } from '../services/auditLogger';


import { getDueDateList } from '../services/dateUtils';


function getDuePeriodsCount(loan: any, today: Date = new Date(), diasMinimos: number = 3, timezone: string = 'America/Costa_Rica'): number {
  const list = getDueDateList(
    loan.fechaInicio,
    loan.diaCobro,
    loan.frecuenciaPago,
    Number(loan.totalAPagar || 0),
    Number(loan.cuotaSemanal || 0),
    diasMinimos,
    timezone,
    loan.modalidad,
    today
  );
  return list.length;
}

// List all loans for the logged-in lender (or cobrador's prestamista)
export async function getLoans(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
  let diasMinimos = 3;
  if (isUsingMemoryStore()) {
    const sub = inMemoryStore.subscriptions.find(s => s.userId === prestamistaId);
    isExpired = sub?.tipo === SubscriptionType.EXPIRED;
    const sett = inMemoryStore.settings.find(s => s.userId === prestamistaId);
    if (sett) {
      diasMinimos = sett.diasMinimosPrimerCobro;
    }
  } else {
    try {
      const sub = await prisma.subscription.findFirst({
        where: { userId: prestamistaId },
        orderBy: { createdAt: 'desc' }
      });
      isExpired = sub?.tipo === SubscriptionType.EXPIRED;
      const sett = await prisma.businessSettings.findUnique({ where: { userId: prestamistaId } });
      if (sett) {
        diasMinimos = sett.diasMinimosPrimerCobro;
      }
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
      const isAlquiler = loan.modalidad === 'ALQUILER';
      
      let balancePendiente = 0;
      let cuotaActual = 0;
      let cuotasTotales = 0;
      
      if (isAlquiler) {
        const totalAbonadoCapital = payments.filter(p => p.tipoPago === 'ABONO_CAPITAL').reduce((sum, p) => sum + p.montoAbonado, 0);
        const totalAbonadoRenta = payments.filter(p => p.tipoPago === 'CUOTA_RENTA').reduce((sum, p) => sum + p.montoAbonado, 0);
        balancePendiente = Number(loan.montoOriginal) + Number(loan.multasAcumuladas || 0) - totalAbonadoCapital;
        cuotaActual = Math.floor(totalAbonadoRenta / Number(loan.cuotaSemanal));
        cuotasTotales = getDuePeriodsCount(loan, new Date(), diasMinimos);
      } else {
        const totalAbonado = payments.filter(p => p.tipoPago !== 'CONDONACION_MORA').reduce((sum, p) => sum + Number(p.montoAbonado), 0);
        balancePendiente = Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0) - totalAbonado;
        const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));
        cuotaActual = Math.min(Math.floor(totalAbonado / Number(loan.cuotaSemanal)), totalCuotasEstimadas);
        cuotasTotales = totalCuotasEstimadas;
      }

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
        cuotaActual,
        cuotasTotales,
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
      const isAlquiler = loan.modalidad === 'ALQUILER';
      
      let balancePendiente = 0;
      let cuotaActual = 0;
      let cuotasTotales = 0;
      
      if (isAlquiler) {
        const totalAbonadoCapital = loan.payments.filter(p => p.tipoPago === 'ABONO_CAPITAL').reduce((sum, p) => sum + Number(p.montoAbonado), 0);
        const totalAbonadoRenta = loan.payments.filter(p => p.tipoPago === 'CUOTA_RENTA').reduce((sum, p) => sum + Number(p.montoAbonado), 0);
        balancePendiente = Number(loan.montoOriginal) + Number(loan.multasAcumuladas || 0) - totalAbonadoCapital;
        cuotaActual = Math.floor(totalAbonadoRenta / Number(loan.cuotaSemanal));
        cuotasTotales = getDuePeriodsCount(loan, new Date(), diasMinimos);
      } else {
        const totalAbonado = loan.payments.filter(p => p.tipoPago !== 'CONDONACION_MORA').reduce((sum, p) => sum + Number(p.montoAbonado), 0);
        balancePendiente = Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0) - totalAbonado;
        const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / Number(loan.cuotaSemanal));
        cuotaActual = Math.min(Math.floor(totalAbonado / Number(loan.cuotaSemanal)), totalCuotasEstimadas);
        cuotasTotales = totalCuotasEstimadas;
      }

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
        cuotaActual,
        cuotasTotales,
        payments: loan.payments.map(p => ({
          ...p,
          montoAbonado: Number(p.montoAbonado)
        }))
      };
    });

    return res.json(loansWithBalance);
  } catch (err: any) { next(err); }
}

// Create a new loan
export async function createLoan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  const userRole = req.user?.rol;

  // COBRADOR no puede crear préstamos
  if (userRole === Role.COBRADOR) {
    return res.status(403).json({ error: 'Los cobradores no pueden crear préstamos.' });
  }

  const {
    clienteNombre, clienteTelefono, montoOriginal, cuotaSemanal, diaCobro,
    tipoIdentificacion, numeroIdentificacion, porcentaje,
    fineAmount, fineFrequency, graceDays, totalAPagarDirect,
    modalidad, frecuenciaPago
  } = req.body;

  const cleanNombre = sanitizeString(clienteNombre, 100);
  const cleanTelefono = sanitizePhone(clienteTelefono);
  const cleanTipoId = (tipoIdentificacion ? sanitizeString(tipoIdentificacion, 50) : 'CEDULA_NACIONAL') as TipoIdentificacion;
  const cleanNumeroId = numeroIdentificacion ? sanitizeString(numeroIdentificacion, 50) : null;

  if (!cleanNombre) {
    return res.status(400).json({ error: 'El nombre del cliente es obligatorio y no puede estar vacío.' });
  }
  if (!cleanTelefono) {
    return res.status(400).json({ error: 'El teléfono del cliente es requerido y debe tener un formato válido.' });
  }

  const parsedMonto = validatePositiveNumber(montoOriginal);
  const parsedCuota = validatePositiveNumber(cuotaSemanal);
  const parsedDia = validateIntegerRange(diaCobro, 1, 31);

  if (parsedMonto === null) {
    return res.status(400).json({ error: 'El monto original debe ser un número mayor a 0.' });
  }
  if (parsedCuota === null) {
    return res.status(400).json({ error: 'La cuota semanal debe ser un número mayor a 0.' });
  }
  if (parsedDia === null) {
    return res.status(400).json({ error: 'El día de cobro debe ser un número válido entre 1 y 31.' });
  }

  const parsedPorcentaje = porcentaje !== undefined && porcentaje !== null ? validatePositiveNumber(porcentaje, true) : null;
  const parsedFineAmount = fineAmount !== undefined && fineAmount !== null ? validatePositiveNumber(fineAmount, true) : null;
  const parsedGraceDays = (graceDays !== undefined && graceDays !== null) ? (validateIntegerRange(graceDays, 0, 365) ?? 0) : 0;
  const parsedTotalAPagarDirect = totalAPagarDirect !== undefined && totalAPagarDirect !== null ? validatePositiveNumber(totalAPagarDirect) : null;

  if (porcentaje !== undefined && porcentaje !== null && parsedPorcentaje === null) {
    return res.status(400).json({ error: 'El porcentaje de interés debe ser un número positivo.' });
  }
  if (fineAmount !== undefined && fineAmount !== null && parsedFineAmount === null) {
    return res.status(400).json({ error: 'El monto de la multa debe ser un número positivo.' });
  }
  if (graceDays !== undefined && graceDays !== null && parsedGraceDays === null) {
    return res.status(400).json({ error: 'Los días de gracia deben ser un número entero positivo.' });
  }
  if (totalAPagarDirect !== undefined && totalAPagarDirect !== null && parsedTotalAPagarDirect === null) {
    return res.status(400).json({ error: 'El monto total a pagar debe ser un número positivo.' });
  }

  // Obtener la modalidad predeterminada de la configuración del prestamista
  let defaultModalidad: 'TRADICIONAL' | 'ALQUILER' = 'TRADICIONAL';
  if (isUsingMemoryStore()) {
    const sett = inMemoryStore.settings.find(s => s.userId === prestamistaId);
    if (sett && sett.modalidadPredeterminada) {
      defaultModalidad = sett.modalidadPredeterminada;
    }
  } else {
    try {
      const sett = await prisma.businessSettings.findUnique({
        where: { userId: prestamistaId },
        select: { modalidadPredeterminada: true }
      });
      if (sett && sett.modalidadPredeterminada) {
        defaultModalidad = sett.modalidadPredeterminada as any;
      }
    } catch {
      defaultModalidad = 'TRADICIONAL';
    }
  }

  const cleanModalidad = (modalidad === 'ALQUILER' || modalidad === 'TRADICIONAL')
    ? (modalidad as LoanModalidad)
    : (defaultModalidad as LoanModalidad);

  const cleanFrecuencia = (frecuenciaPago === 'SEMANAL' || frecuenciaPago === 'QUINCENAL' || frecuenciaPago === 'MENSUAL')
    ? (frecuenciaPago as LoanFrecuencia)
    : ('SEMANAL' as LoanFrecuencia);

  let totalAPagar: number;
  if (cleanModalidad === 'ALQUILER') {
    totalAPagar = parsedMonto;
  } else if (parsedTotalAPagarDirect !== null) {
    totalAPagar = parsedTotalAPagarDirect;
  } else {
    let gananciaPorcentaje = 50;
    if (parsedPorcentaje !== null) {
      gananciaPorcentaje = parsedPorcentaje;
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
      clienteNombre: cleanNombre,
      clienteTelefono: cleanTelefono,
      tipoIdentificacion: cleanTipoId,
      numeroIdentificacion: cleanNumeroId,
      montoOriginal: parsedMonto,
      totalAPagar,
      cuotaSemanal: parsedCuota,
      diaCobro: parsedDia,
      estado: LoanStatus.ACTIVE,
      fechaInicio: new Date(),
      fineAmount: parsedFineAmount,
      fineFrequency: fineFrequency || null,
      graceDays: parsedGraceDays,
      multasAcumuladas: 0,
      modalidad: cleanModalidad,
      frecuenciaPago: cleanFrecuencia
    };
    inMemoryStore.loans.push(newLoan);
    await logActivity(req, 'CREAR_LOAN', `Creó préstamo de ${totalAPagar} para el cliente ${cleanNombre} (${cleanModalidad})`);
    return res.status(201).json({
      ...newLoan,
      balancePendiente: totalAPagar,
      cuotaActual: 0,
      cuotasTotales: cleanModalidad === 'ALQUILER' ? 0 : Math.ceil(totalAPagar / parsedCuota),
      payments: []
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          prestamistaId,
          clienteNombre: cleanNombre,
          clienteTelefono: cleanTelefono,
          tipoIdentificacion: cleanTipoId,
          numeroIdentificacion: cleanNumeroId,
          montoOriginal: parsedMonto,
          totalAPagar,
          cuotaSemanal: parsedCuota,
          diaCobro: parsedDia,
          estado: LoanStatus.ACTIVE,
          fineAmount: parsedFineAmount,
          fineFrequency: fineFrequency || null,
          graceDays: parsedGraceDays,
          multasAcumuladas: 0,
          modalidad: cleanModalidad,
          frecuenciaPago: cleanFrecuencia
        }
      });
      return loan;
    });

    await logActivity(req, 'CREAR_LOAN', `Creó préstamo de ${totalAPagar} para el cliente ${cleanNombre} (${cleanModalidad})`);
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
      cuotaActual: 0,
      cuotasTotales: cleanModalidad === 'ALQUILER' ? 0 : Math.ceil(Number(result.totalAPagar) / Number(result.cuotaSemanal)),
      payments: []
    });
  } catch (err: any) { next(err); }
}

export async function addPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { id: loanId } = req.params;
  const { montoAbonado, notas, metodoPago, tipoPago } = req.body;
  const creadoPorId = req.user?.id;
  const userRole = req.user?.rol;

  const parsedMonto = validatePositiveNumber(montoAbonado);
  if (parsedMonto === null || parsedMonto <= 0) {
    return res.status(400).json({ error: 'Monto abonado debe ser un número válido mayor a 0' });
  }

  const cleanNotas = sanitizeString(notas, 250);

  const metodo: MetodoPago = ([MetodoPago.EFECTIVO, MetodoPago.SINPE, MetodoPago.TRANSFERENCIA].includes(metodoPago as MetodoPago))
    ? metodoPago as MetodoPago
    : MetodoPago.EFECTIVO;
  const numeroRecibo = `REC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  if (isUsingMemoryStore()) {
    const loan = inMemoryStore.loans.find(l => l.id === loanId);
    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    const isAlquiler = loan.modalidad === 'ALQUILER';
    const cleanTipoPago = isAlquiler
      ? (tipoPago === 'ABONO_CAPITAL' ? 'ABONO_CAPITAL' : 'CUOTA_RENTA')
      : 'ABONO_CAPITAL';

    const payments = inMemoryStore.payments.filter(p => p.loanId === loanId);
    
    if (isAlquiler && cleanTipoPago === 'ABONO_CAPITAL') {
      const totalAbonadoCapital = payments.filter(p => p.tipoPago === 'ABONO_CAPITAL').reduce((sum, p) => sum + p.montoAbonado, 0);
      const balanceCapital = Number(loan.montoOriginal) - totalAbonadoCapital;
      if (parsedMonto > balanceCapital) {
        return res.status(400).json({ error: `El abono a capital supera el balance de capital pendiente de ${balanceCapital}` });
      }
    } else if (!isAlquiler) {
      const totalAbonado = payments.filter((p: any) => p.tipoPago !== 'CONDONACION_MORA').reduce((sum, p: any) => sum + Number(p.montoAbonado), 0);
      const balancePendiente = Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0) - totalAbonado;
      if (parsedMonto > balancePendiente) {
        return res.status(400).json({ error: `El abono supera el balance pendiente de ${balancePendiente}` });
      }
    }

    const newPayment = {
      id: `pay-${Date.now()}`,
      loanId,
      montoAbonado: parsedMonto,
      numeroRecibo,
      notes: cleanNotas,
      metodoPago: metodo,
      creadoPorId: creadoPorId || null,
      tipoPago: cleanTipoPago,
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

    if (isAlquiler && cleanTipoPago === 'ABONO_CAPITAL') {
      const totalAbonadoCapital = payments.filter(p => p.tipoPago === 'ABONO_CAPITAL').reduce((sum, p) => sum + p.montoAbonado, 0) + parsedMonto;
      if (totalAbonadoCapital >= Number(loan.montoOriginal)) {
        loan.estado = LoanStatus.PAID;
      }
    } else if (!isAlquiler) {
      const totalAbonado = payments.filter((p: any) => p.tipoPago !== 'CONDONACION_MORA').reduce((sum, p: any) => sum + Number(p.montoAbonado), 0) + parsedMonto;
      if (totalAbonado >= Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0)) {
        loan.estado = LoanStatus.PAID;
      }
    }

    await logActivity(req, 'CREAR_PAGO', `Registró abono de ${parsedMonto} (${cleanTipoPago}) en préstamo del cliente ${loan.clienteNombre}`);
    return res.status(201).json(newPayment);
  }

  try {
    let clienteNombre = '';
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { payments: true }
      });

      if (!loan) throw new Error('Préstamo no encontrado');
      clienteNombre = loan.clienteNombre;

      const isAlquiler = loan.modalidad === 'ALQUILER';
      const cleanTipoPago = isAlquiler
        ? (tipoPago === 'ABONO_CAPITAL' ? PaymentTipo.ABONO_CAPITAL : PaymentTipo.CUOTA_RENTA)
        : PaymentTipo.ABONO_CAPITAL;

      if (isAlquiler && cleanTipoPago === PaymentTipo.ABONO_CAPITAL) {
        const totalAbonadoCapital = loan.payments.filter(p => p.tipoPago === 'ABONO_CAPITAL').reduce((sum, p) => sum + Number(p.montoAbonado), 0);
        const balanceCapital = Number(loan.montoOriginal) - totalAbonadoCapital;
        if (parsedMonto > balanceCapital) {
          throw new Error(`El abono a capital supera el balance de capital pendiente de ${balanceCapital}`);
        }
      } else if (!isAlquiler) {
        const totalAbonado = loan.payments.filter(p => p.tipoPago !== 'CONDONACION_MORA').reduce((sum, p) => sum + Number(p.montoAbonado), 0);
        const balancePendiente = Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0) - totalAbonado;
        if (parsedMonto > balancePendiente) {
          throw new Error(`El abono supera el balance pendiente de ${balancePendiente}`);
        }
      }

      const payment = await tx.payment.create({
        data: {
          loanId,
          montoAbonado: parsedMonto,
          numeroRecibo,
          notas: cleanNotas,
          metodoPago: metodo,
          creadoPorId: creadoPorId || null,
          tipoPago: cleanTipoPago
        }
      });

      if (isAlquiler && cleanTipoPago === PaymentTipo.ABONO_CAPITAL) {
        const totalAbonadoCapital = loan.payments.filter(p => p.tipoPago === 'ABONO_CAPITAL').reduce((sum, p) => sum + Number(p.montoAbonado), 0) + parsedMonto;
        if (totalAbonadoCapital >= Number(loan.montoOriginal)) {
          await tx.loan.update({
            where: { id: loanId },
            data: { estado: LoanStatus.PAID }
          });
        }
      } else if (!isAlquiler) {
        const totalAbonado = loan.payments.filter(p => p.tipoPago !== 'CONDONACION_MORA').reduce((sum, p) => sum + Number(p.montoAbonado), 0) + parsedMonto;
        if (totalAbonado >= Number(loan.totalAPagar) + Number(loan.multasAcumuladas || 0)) {
          await tx.loan.update({
            where: { id: loanId },
            data: { estado: LoanStatus.PAID }
          });
        }
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

    await logActivity(req, 'CREAR_PAGO', `Registró abono de ${parsedMonto} (${result.tipoPago}) en préstamo del cliente ${clienteNombre}`);
    return res.status(201).json({
      ...result,
      montoAbonado: Number(result.montoAbonado)
    });
  } catch (err: any) { next(err); }
}

// Delete/void a payment (Restricted: COBRADOR cannot do this)
export async function deletePayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
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
  } catch (err: any) { next(err); }
}

// Update/Edit a loan (Restricted: ONLY Admin in Impersonation Mode can edit loans)
export async function updateLoan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { id } = req.params;
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  const userRole = req.user?.rol;
  const isImpersonating = req.user?.isImpersonating;

  if (!isImpersonating) {
    return res.status(403).json({ error: 'La edición de préstamos es una función exclusiva del Administrador mediante impersonación.' });
  }

  if (userRole === Role.COBRADOR) {
    return res.status(403).json({ error: 'Los cobradores no pueden editar préstamos.' });
  }


  const {
    clienteNombre, clienteTelefono, tipoIdentificacion, numeroIdentificacion,
    montoOriginal, cuotaSemanal, diaCobro, fineAmount, fineFrequency, graceDays,
    totalAPagarDirect, porcentaje, hasFine
  } = req.body;

  const cleanNombre = clienteNombre !== undefined ? sanitizeString(clienteNombre, 100) : undefined;
  const cleanTelefono = clienteTelefono !== undefined ? sanitizePhone(clienteTelefono) : undefined;
  const cleanTipoId = tipoIdentificacion !== undefined ? sanitizeString(tipoIdentificacion, 50) : undefined;
  const cleanNumeroId = numeroIdentificacion !== undefined ? sanitizeString(numeroIdentificacion, 50) : undefined;

  const parsedMonto = montoOriginal !== undefined ? validatePositiveNumber(montoOriginal) : undefined;
  const parsedCuota = cuotaSemanal !== undefined ? validatePositiveNumber(cuotaSemanal) : undefined;
  const parsedDia = diaCobro !== undefined ? validateIntegerRange(diaCobro, 1, 31) : undefined;

  if (montoOriginal !== undefined && parsedMonto === null) {
    return res.status(400).json({ error: 'El monto original debe ser un número mayor a 0.' });
  }
  if (cuotaSemanal !== undefined && parsedCuota === null) {
    return res.status(400).json({ error: 'La cuota pactada debe ser un número mayor a 0.' });
  }
  if (diaCobro !== undefined && parsedDia === null) {
    return res.status(400).json({ error: 'El día de cobro debe ser un número válido entre 1 y 31.' });
  }

  const parsedFineAmount = fineAmount !== undefined && fineAmount !== null ? validatePositiveNumber(fineAmount, true) : undefined;
  const parsedGraceDays = graceDays !== undefined && graceDays !== null ? validateIntegerRange(graceDays, 0, 365) : undefined;
  const parsedTotalAPagarDirect = totalAPagarDirect !== undefined && totalAPagarDirect !== null ? validatePositiveNumber(totalAPagarDirect) : undefined;
  const parsedPorcentaje = porcentaje !== undefined && porcentaje !== null ? validatePositiveNumber(porcentaje, true) : undefined;

  if (fineAmount !== undefined && fineAmount !== null && parsedFineAmount === null) {
    return res.status(400).json({ error: 'El monto de la multa debe ser un número positivo.' });
  }
  if (graceDays !== undefined && graceDays !== null && parsedGraceDays === null) {
    return res.status(400).json({ error: 'Los días de gracia deben ser un número entero positivo.' });
  }
  if (totalAPagarDirect !== undefined && totalAPagarDirect !== null && parsedTotalAPagarDirect === null) {
    return res.status(400).json({ error: 'El monto total a pagar debe ser un número positivo.' });
  }
  if (porcentaje !== undefined && porcentaje !== null && parsedPorcentaje === null) {
    return res.status(400).json({ error: 'El porcentaje de interés debe ser un número positivo.' });
  }

  if (isUsingMemoryStore()) {
    const loan = inMemoryStore.loans.find(l => l.id === id && l.prestamistaId === prestamistaId);
    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    const payments = inMemoryStore.payments.filter(p => p.loanId === id);
    const hasPayments = payments.length > 0;

    // Actualizar datos del cliente
    loan.clienteNombre = cleanNombre !== undefined && cleanNombre !== '' ? cleanNombre : loan.clienteNombre;
    loan.clienteTelefono = cleanTelefono !== undefined && cleanTelefono !== '' ? cleanTelefono : loan.clienteTelefono;
    loan.tipoIdentificacion = cleanTipoId !== undefined ? cleanTipoId : loan.tipoIdentificacion;
    loan.numeroIdentificacion = cleanNumeroId !== undefined ? cleanNumeroId : loan.numeroIdentificacion;
    loan.diaCobro = parsedDia !== undefined ? parsedDia! : loan.diaCobro;

    // Actualizar multas
    if (hasFine !== undefined) {
      if (hasFine) {
        loan.fineAmount = parsedFineAmount !== undefined ? parsedFineAmount : loan.fineAmount;
        loan.fineFrequency = fineFrequency || loan.fineFrequency;
        loan.graceDays = (parsedGraceDays !== undefined && parsedGraceDays !== null) ? parsedGraceDays : loan.graceDays;
      } else {
        loan.fineAmount = null;
        loan.fineFrequency = null;
        loan.graceDays = 0;
        loan.multasAcumuladas = 0;
      }
    }

    // Si no tiene abonos, permitir editar montos
    if (!hasPayments) {
      if (parsedMonto !== undefined) {
        loan.montoOriginal = parsedMonto!;
      }
      if (parsedCuota !== undefined) {
        loan.cuotaSemanal = parsedCuota!;
      }
      if (loan.modalidad === 'ALQUILER') {
        loan.totalAPagar = loan.montoOriginal;
      } else {
        if (parsedTotalAPagarDirect !== undefined && parsedTotalAPagarDirect !== null) {
          loan.totalAPagar = parsedTotalAPagarDirect!;
        } else if (parsedPorcentaje !== undefined && parsedPorcentaje !== null && parsedMonto !== undefined) {
          loan.totalAPagar = parsedMonto! * (1 + (parsedPorcentaje! / 100));
        } else if (parsedPorcentaje !== undefined && parsedPorcentaje !== null) {
          loan.totalAPagar = Number(loan.montoOriginal) * (1 + (parsedPorcentaje! / 100));
        } else if (parsedMonto !== undefined) {
          const currentPercentage = ((Number(loan.totalAPagar) / Number(loan.montoOriginal)) - 1) * 100;
          loan.totalAPagar = parsedMonto! * (1 + (currentPercentage / 100));
        }
      }
    }

    await logActivity(req, 'EDITAR_LOAN', `Actualizó préstamo del cliente ${loan.clienteNombre} (ID: ${loan.id})`);
    return res.json({ success: true, loan });
  }

  try {
    const loan = await prisma.loan.findFirst({
      where: { id, prestamistaId },
      include: { payments: true }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    const hasPayments = loan.payments.length > 0;

    const dataToUpdate: any = {
      clienteNombre: cleanNombre !== undefined && cleanNombre !== '' ? cleanNombre : loan.clienteNombre,
      clienteTelefono: cleanTelefono !== undefined && cleanTelefono !== '' ? cleanTelefono : loan.clienteTelefono,
      tipoIdentificacion: cleanTipoId !== undefined ? cleanTipoId : loan.tipoIdentificacion,
      numeroIdentificacion: cleanNumeroId !== undefined ? cleanNumeroId : loan.numeroIdentificacion,
      diaCobro: parsedDia !== undefined ? parsedDia! : loan.diaCobro,
    };

    if (hasFine !== undefined) {
      if (hasFine) {
        dataToUpdate.fineAmount = parsedFineAmount !== undefined ? parsedFineAmount : loan.fineAmount;
        dataToUpdate.fineFrequency = fineFrequency || loan.fineFrequency;
        dataToUpdate.graceDays = (parsedGraceDays !== undefined && parsedGraceDays !== null) ? parsedGraceDays : loan.graceDays;
      } else {
        dataToUpdate.fineAmount = null;
        dataToUpdate.fineFrequency = null;
        dataToUpdate.graceDays = 0;
        dataToUpdate.multasAcumuladas = 0;
      }
    }

    if (!hasPayments) {
      if (parsedMonto !== undefined) {
        dataToUpdate.montoOriginal = parsedMonto!;
      }
      if (parsedCuota !== undefined) {
        dataToUpdate.cuotaSemanal = parsedCuota!;
      }
      if (loan.modalidad === 'ALQUILER') {
        dataToUpdate.totalAPagar = parsedMonto !== undefined ? parsedMonto : loan.montoOriginal;
      } else {
        if (parsedTotalAPagarDirect !== undefined && parsedTotalAPagarDirect !== null) {
          dataToUpdate.totalAPagar = parsedTotalAPagarDirect!;
        } else if (parsedPorcentaje !== undefined && parsedPorcentaje !== null && parsedMonto !== undefined) {
          dataToUpdate.totalAPagar = parsedMonto! * (1 + (parsedPorcentaje! / 100));
        } else if (parsedPorcentaje !== undefined && parsedPorcentaje !== null) {
          dataToUpdate.totalAPagar = Number(loan.montoOriginal) * (1 + (parsedPorcentaje! / 100));
        } else if (parsedMonto !== undefined) {
          const currentPercentage = ((Number(loan.totalAPagar) / Number(loan.montoOriginal)) - 1) * 100;
          dataToUpdate.totalAPagar = parsedMonto! * (1 + (currentPercentage / 100));
        }
      }
    }

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: dataToUpdate
    });

    await logActivity(req, 'EDITAR_LOAN', `Actualizó préstamo del cliente ${updatedLoan.clienteNombre} (ID: ${updatedLoan.id})`);
    return res.json({ success: true, loan: updatedLoan });
  } catch (err: any) { next(err); }
}

// Delete/Void an entire loan (Restricted: COBRADOR cannot do this)
export async function deleteLoan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { id } = req.params;
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  const userRole = req.user?.rol;

  if (userRole === Role.COBRADOR) {
    return res.status(403).json({ error: 'Los cobradores no pueden eliminar préstamos.' });
  }

  if (isUsingMemoryStore()) {
    const loanIdx = inMemoryStore.loans.findIndex(l => l.id === id && l.prestamistaId === prestamistaId);
    if (loanIdx === -1) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }
    const deletedLoan = inMemoryStore.loans[loanIdx];
    // Delete associated payments
    inMemoryStore.payments = inMemoryStore.payments.filter(p => p.loanId !== id);
    // Delete loan
    inMemoryStore.loans.splice(loanIdx, 1);
    await logActivity(req, 'ELIMINAR_LOAN', `Eliminó préstamo del cliente ${deletedLoan.clienteNombre} (ID: ${deletedLoan.id})`);
    return res.json({ success: true, message: 'Préstamo eliminado correctamente en memoria' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findFirst({
        where: { id, prestamistaId },
        include: { payments: true }
      });

      if (!loan) {
        throw new Error('Préstamo no encontrado');
      }

      // Restar los abonos de este préstamo de la caja de sus respectivos cobradores
      for (const payment of loan.payments) {
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
      }

      // Delete loan
      await tx.loan.delete({
        where: { id }
      });

      return loan;
    });

    await logActivity(req, 'ELIMINAR_LOAN', `Eliminó préstamo del cliente ${result.clienteNombre} (ID: ${result.id})`);
    return res.json({ success: true, message: 'Préstamo y abonos eliminados correctamente', loan: result });
  } catch (err: any) { next(err); }
}

// Condonar mora acumulada de un préstamo (Restringido estrictamente a PRESTAMISTA o Admin)
export async function condonarMora(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const { id } = req.params;
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  const userRole = req.user?.rol;

  if (userRole === Role.COBRADOR) {
    return res.status(403).json({ error: 'Los cobradores no tienen permisos para condonar mora.' });
  }

  const { montoCondonado, motivo } = req.body;
  const parsedMonto = validatePositiveNumber(montoCondonado, true);

  if (parsedMonto === null || parsedMonto <= 0) {
    return res.status(400).json({ error: 'El monto a condonar debe ser un número válido mayor a 0.' });
  }

  const cleanMotivo = motivo && motivo.trim() ? sanitizeString(motivo, 250) : 'Exoneración de mora otorgada por el prestamista';
  const condRecibo = 'COND-' + Math.floor(100000 + Math.random() * 900000);

  if (isUsingMemoryStore()) {
    const loan = inMemoryStore.loans.find(l => l.id === id && l.prestamistaId === prestamistaId);
    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }
    const currentCondonado = Number(loan.montoCondonado || 0);
    const newCondonado = currentCondonado + parsedMonto;
    const currentMultas = Number(loan.multasAcumuladas || 0);
    const newMultas = Math.max(0, currentMultas - parsedMonto);
    loan.montoCondonado = newCondonado;
    loan.multasAcumuladas = newMultas;

    inMemoryStore.payments.push({
      id: Math.random().toString(),
      loanId: id,
      montoAbonado: parsedMonto,
      numeroRecibo: condRecibo,
      notas: cleanMotivo,
      metodoPago: 'EFECTIVO',
      creadoPorId: req.user?.id,
      tipoPago: 'CONDONACION_MORA',
      fechaPago: new Date()
    });

    await logActivity(req, 'CONDONAR_MORA', `Condonó ₡${parsedMonto} de mora al cliente ${loan.clienteNombre}. Motivo: ${cleanMotivo}`);
    return res.json({ success: true, message: `Se condonaron ₡${parsedMonto} de mora correctamente`, loan });
  }

  try {
    const loan = await prisma.loan.findFirst({
      where: { id, prestamistaId }
    });

    if (!loan) {
      return res.status(404).json({ error: 'Préstamo no encontrado' });
    }

    const currentCondonado = Number(loan.montoCondonado || 0);
    const newCondonado = currentCondonado + parsedMonto;
    const currentMultas = Number(loan.multasAcumuladas || 0);
    const newMultas = Math.max(0, currentMultas - parsedMonto);

    await prisma.payment.create({
      data: {
        loanId: id,
        montoAbonado: parsedMonto,
        numeroRecibo: condRecibo,
        notas: cleanMotivo,
        tipoPago: 'CONDONACION_MORA' as any,
        creadoPorId: req.user?.id
      }
    });

    const updatedLoan = await prisma.loan.update({
      where: { id },
      data: {
        montoCondonado: newCondonado,
        multasAcumuladas: newMultas
      },
      include: {
        payments: true
      }
    });

    await logActivity(req, 'CONDONAR_MORA', `Condonó ₡${parsedMonto} de mora al cliente ${loan.clienteNombre}. Motivo: ${cleanMotivo}`);
    return res.json({ success: true, message: `Se condonaron ₡${parsedMonto} de mora correctamente`, loan: updatedLoan });

  } catch (err: any) { next(err); }
}

// Reversar / Anular Condonación de Mora
export async function reversarCondonacion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const prestamistaId = req.user?.id || 'mock-lender-id-123';
  const userRole = req.user?.rol;
  const { id } = req.params;
  const { paymentId } = req.body;

  if (userRole === Role.COBRADOR) {
    return res.status(403).json({ error: 'Los cobradores no pueden reversar condonaciones de mora.' });
  }

  if (isUsingMemoryStore()) {
    const loan = inMemoryStore.loans.find(l => l.id === id && l.prestamistaId === prestamistaId);
    if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });

    let condPayments = inMemoryStore.payments.filter(p => p.loanId === id && p.tipoPago === 'CONDONACION_MORA');
    if (paymentId) {
      condPayments = condPayments.filter(p => p.id === paymentId);
    }
    const totalReversado = condPayments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);

    inMemoryStore.payments = inMemoryStore.payments.filter(p => !(p.loanId === id && p.tipoPago === 'CONDONACION_MORA' && (!paymentId || p.id === paymentId)));

    const currentCondonado = Number(loan.montoCondonado || 0);
    loan.montoCondonado = paymentId && totalReversado > 0 ? Math.max(0, currentCondonado - totalReversado) : 0;

    await updatePenaltiesForTenant(prestamistaId);
    await logActivity(req, 'REVERSAR_CONDONACION', `Reversó condonación de mora al cliente ${loan.clienteNombre}`);
    return res.json({ success: true, message: 'Condonación de mora reversada correctamente', loan });
  }

  try {
    const loan = await prisma.loan.findFirst({
      where: { id, prestamistaId }
    });

    if (!loan) return res.status(404).json({ error: 'Préstamo no encontrado' });

    let condPayments = await prisma.payment.findMany({
      where: {
        loanId: id,
        tipoPago: 'CONDONACION_MORA' as any,
        ...(paymentId ? { id: paymentId } : {})
      }
    });

    const totalReversado = condPayments.reduce((sum, p) => sum + Number(p.montoAbonado), 0);

    if (condPayments.length > 0) {
      await prisma.payment.deleteMany({
        where: {
          id: { in: condPayments.map(p => p.id) }
        }
      });
    }

    const currentCondonado = Number(loan.montoCondonado || 0);
    const newCondonado = paymentId && totalReversado > 0 ? Math.max(0, currentCondonado - totalReversado) : 0;

    await prisma.loan.update({
      where: { id },
      data: { montoCondonado: newCondonado }
    });

    await updatePenaltiesForTenant(prestamistaId);

    const updatedLoan = await prisma.loan.findUnique({
      where: { id },
      include: { payments: true }
    });

    await logActivity(req, 'REVERSAR_CONDONACION', `Reversó condonación de mora al cliente ${loan.clienteNombre}`);
    return res.json({ success: true, message: 'Condonación de mora reversada correctamente', loan: updatedLoan });

  } catch (err: any) { next(err); }
}

