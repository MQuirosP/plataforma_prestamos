/**
 * Utility module for multi-tenant timezone-aware date calculations in Frontend.
 */

/**
 * Returns a YYYY-MM-DD string representation of a given Date in a target IANA timezone.
 */
export function getDateStringInTimezone(date: Date | string, timezone: string = 'America/Costa_Rica'): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d); // YYYY-MM-DD
  } catch {
    const iso = d.toISOString();
    return iso.split('T')[0];
  }
}

/**
 * Calculates the current weekday (1 = Mon, 7 = Sun) in a target IANA timezone.
 */
export function getWeekdayInTimezone(date: Date | string = new Date(), timezone: string = 'America/Costa_Rica'): number {
  const dateStr = getDateStringInTimezone(date, timezone);
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  const day = d.getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Formats next payment date string in Spanish (e.g. "Hoy (Sáb, 18 jul)", "Mañana (Dom, 19 jul)", "Vencido (Sáb, 18 jul)", or "Sáb, 15 ago")
 */
export function formatNextPaymentDate(
  loan: any,
  timezone: string = 'America/Costa_Rica',
  diasMinimos: number = 3
): string {
  if (!loan || !loan.fechaInicio) return '';

  const startStr = getDateStringInTimezone(loan.fechaInicio, timezone);
  const todayStr = getDateStringInTimezone(new Date(), timezone);
  const isAlquiler = loan.modalidad === 'ALQUILER';
  const freq = loan.frecuenciaPago || 'SEMANAL';
  const cuotaAmount = Number(loan.cuotaSemanal || 0);

  let numCuotasAbonadas = 0;
  let totalCuotasEstimadas = 999999;

  const payments = loan.payments || [];
  if (isAlquiler) {
    const totalRenta = payments
      .filter((p: any) => p.tipoPago === 'CUOTA_RENTA')
      .reduce((sum: number, p: any) => sum + Number(p.montoAbonado), 0);
    numCuotasAbonadas = cuotaAmount > 0 ? Math.floor(totalRenta / cuotaAmount) : 0;
  } else {
    const totalAbonado = payments
      .filter((p: any) => p.tipoPago !== 'CONDONACION_MORA')
      .reduce((sum: number, p: any) => sum + Number(p.montoAbonado), 0);
    numCuotasAbonadas = cuotaAmount > 0 ? Math.floor(totalAbonado / cuotaAmount) : 0;
    totalCuotasEstimadas = cuotaAmount > 0 ? Math.ceil(Number(loan.totalAPagar || 0) / cuotaAmount) : 1;
  }

  const targetIdx = Math.max(0, Math.min(numCuotasAbonadas, totalCuotasEstimadas - 1));

  // Compute first due date
  let current = new Date(`${startStr}T12:00:00.000Z`);
  if (freq === 'SEMANAL') {
    const targetWeekday = loan.diaCobro;
    const startWeekday = getWeekdayInTimezone(startStr, timezone);
    let dayOffset = targetWeekday - startWeekday;
    if (dayOffset < 0) dayOffset += 7;
    if (dayOffset < diasMinimos) dayOffset += 7;
    current.setUTCDate(current.getUTCDate() + dayOffset);
    current.setUTCDate(current.getUTCDate() + targetIdx * 7);
  } else if (freq === 'QUINCENAL') {
    current.setUTCDate(current.getUTCDate() + 15 + targetIdx * 15);
  } else {
    const targetDay = loan.diaCobro && loan.diaCobro >= 1 && loan.diaCobro <= 31 ? loan.diaCobro : current.getUTCDate();
    current.setUTCMonth(current.getUTCMonth() + 1 + targetIdx);
    const daysInM = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
    current.setUTCDate(Math.min(targetDay, daysInM));
  }

  const targetStr = getDateStringInTimezone(current, timezone);

  // Compute diff in days
  const todayUtc = new Date(`${todayStr}T00:00:00.000Z`).getTime();
  const targetUtc = new Date(`${targetStr}T00:00:00.000Z`).getTime();
  const diffDays = Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));

  // Format label
  const dParts = targetStr.split('-');
  const dateObj = new Date(Date.UTC(Number(dParts[0]), Number(dParts[1]) - 1, Number(dParts[2]), 12, 0, 0));
  const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
  let formatted = new Intl.DateTimeFormat('es-ES', options).format(dateObj).replace(/\./g, '');
  formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  if (diffDays === 0) return `Hoy (${formatted})`;
  if (diffDays === 1) return `Mañana (${formatted})`;
  if (diffDays < 0) return `Vencido (${formatted})`;
  return formatted;
}
