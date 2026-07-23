import { prisma, isUsingMemoryStore, inMemoryStore } from './db';
import { Loan, LoanStatus, FineFrequency } from '@prisma/client';

export async function updatePenaltiesForTenant(prestamistaId: string) {
  const today = new Date();

  let diasMinimosPrimerCobro = 3;
  if (isUsingMemoryStore()) {
    const settings = inMemoryStore.settings.find(s => s.userId === prestamistaId);
    if (settings) {
      diasMinimosPrimerCobro = settings.diasMinimosPrimerCobro;
    }
  } else {
    try {
      const settings = await prisma.businessSettings.findUnique({
        where: { userId: prestamistaId }
      });
      if (settings) {
        diasMinimosPrimerCobro = settings.diasMinimosPrimerCobro;
      }
    } catch (err) {
      // Keep default of 3
    }
  }

  if (isUsingMemoryStore()) {
    const activeLoans = inMemoryStore.loans.filter(
      l => l.prestamistaId === prestamistaId && l.estado === LoanStatus.ACTIVE
    );

    for (const loan of activeLoans) {
      calculateAndSetPenalties(loan, today, diasMinimosPrimerCobro);
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
      const { multasAcumuladas } = calculateAndSetPenalties(loan, today, diasMinimosPrimerCobro);
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

function calculateAndSetPenalties(loan: any, today: Date, diasMinimosPrimerCobro: number = 3) {
  if (!loan.fineAmount || !loan.fineFrequency || Number(loan.fineAmount) <= 0) {
    loan.multasAcumuladas = 0;
    return { multasAcumuladas: 0 };
  }

  const startDate = new Date(loan.fechaInicio);
  const cuotaAmount = Number(loan.cuotaSemanal);
  
  // Calculate total payments received
  const payments = loan.payments || [];
  const totalAbonado = payments.reduce((sum: number, p: any) => sum + Number(p.montoAbonado), 0);
  const numCuotasAbonadas = Math.floor(totalAbonado / cuotaAmount);

  // Generate due dates since startDate up to today
  // diaCobro: 1 = Lunes, 7 = Domingo
  const dueDates: Date[] = [];
  let current = new Date(startDate);
  
  // Align current to the first diaCobro on or after startDate
  const jsDayCobro = loan.diaCobro === 7 ? 0 : loan.diaCobro;
  let dayOffset = jsDayCobro - current.getDay();
  if (dayOffset < 0) {
    dayOffset += 7;
  }
  
  // Regla de propuesta 3: si el primer cobro cae a menos del umbral de días mínimos, sumar 7 días (pasar a la siguiente semana)
  if (dayOffset < diasMinimosPrimerCobro) {
    dayOffset += 7;
  }
  
  current.setDate(current.getDate() + dayOffset);

  // We generate up to the total number of expected installments
  const totalCuotasEstimadas = Math.ceil(Number(loan.totalAPagar) / cuotaAmount);

  while (current <= today && dueDates.length < totalCuotasEstimadas) {
    dueDates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  const N = dueDates.length; // number of installments that have fallen due
  const P = numCuotasAbonadas; // number of installments fully covered by payments

  if (P >= N) {
    loan.multasAcumuladas = 0;
    return { multasAcumuladas: 0 };
  }

  // Oldest unpaid installment was due on:
  const oldestDueDate = dueDates[P];
  const diffTime = today.getTime() - oldestDueDate.getTime();
  const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  if (daysLate <= loan.graceDays) {
    loan.multasAcumuladas = 0;
    return { multasAcumuladas: 0 };
  }

  let penalties = 0;
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

  loan.multasAcumuladas = penalties;
  return { multasAcumuladas: penalties };
}
