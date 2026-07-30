import { prisma, isUsingMemoryStore, inMemoryStore } from './db';
import { Loan, LoanStatus, FineFrequency } from '@prisma/client';
import { getDaysDiffInTimezone, getDateStringInTimezone, getWeekdayInTimezone, getDueDateList } from './dateUtils';


export async function updatePenaltiesForTenant(prestamistaId: string) {
  const today = new Date();

  let diasMinimosPrimerCobro = 3;
  let timezone = 'America/Costa_Rica';

  if (isUsingMemoryStore()) {
    const settings = inMemoryStore.settings.find(s => s.userId === prestamistaId);
    if (settings) {
      diasMinimosPrimerCobro = settings.diasMinimosPrimerCobro;
      timezone = settings.timezone || timezone;
    }
  } else {
    try {
      const settings = await prisma.businessSettings.findUnique({
        where: { userId: prestamistaId }
      });
      if (settings) {
        diasMinimosPrimerCobro = settings.diasMinimosPrimerCobro;
        timezone = settings.timezone || timezone;
      }
    } catch (err) {
      // Keep defaults
    }
  }

  if (isUsingMemoryStore()) {
    const activeLoans = inMemoryStore.loans.filter(
      l => l.prestamistaId === prestamistaId && l.estado === LoanStatus.ACTIVE
    );

    for (const loan of activeLoans) {
      calculateAndSetPenalties(loan, today, diasMinimosPrimerCobro, timezone);
    }
    return;
  }


  try {
    const activeLoans = await prisma.loan.findMany({
      where: {
        prestamistaId,
        estado: LoanStatus.ACTIVE
      },
      include: {
        payments: true
      }
    });

    for (const loan of activeLoans) {
      const originalMultas = Number(loan.multasAcumuladas || 0);
      const { multasAcumuladas } = calculateAndSetPenalties(loan, today, diasMinimosPrimerCobro, timezone);
      if (originalMultas !== multasAcumuladas) {
        await prisma.loan.update({
          where: { id: loan.id },
          data: { multasAcumuladas }
        });
      }
    }
  } catch (err) {
    console.error('Error updating penalties:', err);
  }
}

function calculateAndSetPenalties(loan: any, today: Date, diasMinimosPrimerCobro: number = 3, timezone: string = 'America/Costa_Rica') {

  if (!loan.fineAmount || !loan.fineFrequency || Number(loan.fineAmount) <= 0) {
    return { multasAcumuladas: Number(loan.multasAcumuladas || 0) };
  }

  const todayStr = getDateStringInTimezone(today, timezone);
  const startStr = getDateStringInTimezone(loan.fechaInicio, timezone);
  const cuotaAmount = Number(loan.cuotaSemanal);
  
  // Calculate total payments received
  const payments = loan.payments || [];
  const isAlquiler = loan.modalidad === 'ALQUILER';
  const freq = loan.frecuenciaPago || 'SEMANAL';
  
  let numCuotasAbonadas = 0;
  if (isAlquiler) {
    const totalAbonadoRenta = payments.filter((p: any) => p.tipoPago === 'CUOTA_RENTA').reduce((sum: number, p: any) => sum + Number(p.montoAbonado), 0);
    numCuotasAbonadas = Math.floor(totalAbonadoRenta / cuotaAmount);
  } else {
    const totalAbonado = payments.filter((p: any) => p.tipoPago !== 'CONDONACION_MORA').reduce((sum: number, p: any) => sum + Number(p.montoAbonado), 0);
    numCuotasAbonadas = Math.floor(totalAbonado / cuotaAmount);
  }

  // Generate due dates since startStr up to todayStr
  const dueDates = getDueDateList(
    loan.fechaInicio,
    loan.diaCobro,
    loan.frecuenciaPago,
    Number(loan.totalAPagar),
    cuotaAmount,
    diasMinimosPrimerCobro,
    timezone,
    loan.modalidad,
    today
  );

  const N = dueDates.length; // number of installments that have fallen due
  const P = numCuotasAbonadas; // number of installments fully covered by payments

  let penalties = 0;
  if (P < N) {
    const oldestDueDateStr = dueDates[P];
    const daysLate = getDaysDiffInTimezone(oldestDueDateStr, todayStr, timezone);

    if (daysLate > loan.graceDays) {
      const fine = Number(loan.fineAmount);
      if (loan.fineFrequency === FineFrequency.DAILY) {
        penalties = (daysLate - loan.graceDays) * fine;
      } else if (loan.fineFrequency === FineFrequency.WEEKLY) {
        const weeksLate = Math.floor((daysLate - loan.graceDays) / 7);
        penalties = weeksLate * fine;
      } else if (loan.fineFrequency === FineFrequency.MONTHLY) {
        const monthsLate = Math.floor((daysLate - loan.graceDays) / 30);
        penalties = monthsLate * fine;
      }
    }
  }

  const condonado = Number(loan.montoCondonado || 0);
  const finalPenalties = Math.max(0, penalties - condonado);
  loan.multasAcumuladas = finalPenalties;
  return { multasAcumuladas: finalPenalties };
}



