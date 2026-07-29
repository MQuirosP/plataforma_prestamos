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
    return { multasAcumuladas: Number(loan.multasAcumuladas || 0) };
  }


  const startDate = new Date(loan.fechaInicio);
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
    const totalAbonado = payments.reduce((sum: number, p: any) => sum + Number(p.montoAbonado), 0);
    numCuotasAbonadas = Math.floor(totalAbonado / cuotaAmount);
  }

  // Generate due dates since startDate up to today
  const dueDates: Date[] = [];
  let current = new Date(startDate);
  
  if (freq === 'SEMANAL') {
    const jsDayCobro = loan.diaCobro === 7 ? 0 : loan.diaCobro;
    let dayOffset = jsDayCobro - current.getDay();
    if (dayOffset < 0) dayOffset += 7;
    if (dayOffset < diasMinimosPrimerCobro) dayOffset += 7;
    current.setDate(current.getDate() + dayOffset);
    
    const totalCuotasEstimadas = isAlquiler ? 999999 : Math.ceil(Number(loan.totalAPagar) / cuotaAmount);

    while (current <= today && dueDates.length < totalCuotasEstimadas) {
      dueDates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
  } else if (freq === 'QUINCENAL') {
    current.setDate(current.getDate() + 15);
    const totalCuotasEstimadas = isAlquiler ? 999999 : Math.ceil(Number(loan.totalAPagar) / cuotaAmount);
    
    while (current <= today && dueDates.length < totalCuotasEstimadas) {
      dueDates.push(new Date(current));
      current.setDate(current.getDate() + 15);
    }
  } else {
    current.setMonth(current.getMonth() + 1);
    const totalCuotasEstimadas = isAlquiler ? 999999 : Math.ceil(Number(loan.totalAPagar) / cuotaAmount);
    
    while (current <= today && dueDates.length < totalCuotasEstimadas) {
      dueDates.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
  }

  const N = dueDates.length; // number of installments that have fallen due
  const P = numCuotasAbonadas; // number of installments fully covered by payments

  let penalties = 0;
  if (P < N) {

    const oldestDueDate = new Date(dueDates[P]);
    oldestDueDate.setHours(0, 0, 0, 0);

    const todayClean = new Date(today);
    todayClean.setHours(0, 0, 0, 0);

    const diffTime = todayClean.getTime() - oldestDueDate.getTime();
    const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));


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



