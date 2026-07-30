/**
 * Utility module for multi-tenant, timezone-aware date calculations.
 * Avoids any hardcoded defaults or global server process.env.TZ reliance.
 * All functions operate strictly on standard IANA timezone identifiers passed from BusinessSettings (e.g. 'America/Costa_Rica', 'America/Mexico_City').
 */

/**
 * Returns a YYYY-MM-DD string representation of a given Date in a target IANA timezone.
 */
export function getDateStringInTimezone(date: Date | string, timezone: string): string {
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
    return formatter.format(d); // Returns YYYY-MM-DD
  } catch (err) {
    const iso = d.toISOString();
    return iso.split('T')[0];
  }
}

/**
 * Returns a Date object representing 00:00:00.000 (Midnight) of the target Date in the specified IANA timezone.
 */
export function getMidnightInTimezone(date: Date | string, timezone: string): Date {
  const dateStr = getDateStringInTimezone(date, timezone);
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Calculates the exact number of full calendar days elapsed between two dates
 * evaluated strictly within the context of the tenant's IANA timezone.
 */
export function getDaysDiffInTimezone(startDate: Date | string, endDate: Date | string, timezone: string): number {
  const startStr = getDateStringInTimezone(startDate, timezone);
  const endStr = getDateStringInTimezone(endDate, timezone);

  const startUtc = new Date(`${startStr}T00:00:00.000Z`).getTime();
  const endUtc = new Date(`${endStr}T00:00:00.000Z`).getTime();

  const diffMs = endUtc - startUtc;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Determines the current weekday number (1 = Mon, 7 = Sun) for a given date in a target IANA timezone.
 */
export function getWeekdayInTimezone(date: Date | string, timezone: string): number {
  const dateStr = getDateStringInTimezone(date, timezone);
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  const day = d.getUTCDay();
  return day === 0 ? 7 : day;
}

/**
 * Projects the complete list of due dates (in YYYY-MM-DD strings) for a given loan up to today (or max installments),
 * evaluated strictly within the specified IANA timezone.
 */
export function getDueDateList(
  fechaInicio: Date | string,
  diaCobro: number,
  frecuenciaPago: string = 'SEMANAL',
  totalAPagar: number,
  cuotaSemanal: number,
  diasMinimosPrimerCobro: number = 3,
  timezone: string = 'America/Costa_Rica',
  modalidad: string = 'TRADICIONAL',
  todayDate: Date | string = new Date()
): string[] {
  const todayStr = getDateStringInTimezone(todayDate, timezone);
  const startStr = getDateStringInTimezone(fechaInicio, timezone);
  const cuotaAmount = Number(cuotaSemanal);
  const isAlquiler = modalidad === 'ALQUILER';
  const freq = frecuenciaPago || 'SEMANAL';

  const dueDates: string[] = [];
  let current = new Date(`${startStr}T12:00:00.000Z`);

  if (freq === 'SEMANAL') {
    const targetWeekday = diaCobro; // 1 = Mon, 7 = Sun
    const currentWeekday = getWeekdayInTimezone(startStr, timezone);
    let dayOffset = targetWeekday - currentWeekday;
    if (dayOffset < 0) dayOffset += 7;
    if (dayOffset < diasMinimosPrimerCobro) dayOffset += 7;
    current.setUTCDate(current.getUTCDate() + dayOffset);

    const totalCuotasEstimadas = isAlquiler ? 999999 : Math.ceil(Number(totalAPagar) / cuotaAmount);

    while (getDateStringInTimezone(current, timezone) <= todayStr && dueDates.length < totalCuotasEstimadas) {
      dueDates.push(getDateStringInTimezone(current, timezone));
      current.setUTCDate(current.getUTCDate() + 7);
    }
  } else if (freq === 'QUINCENAL') {
    const isBiweekly = diaCobro === 2 || diaCobro === 5;
    
    if (isBiweekly) {
      const targetWeekday = diaCobro;
      const currentWeekday = getWeekdayInTimezone(startStr, timezone);
      let dayOffset = targetWeekday - currentWeekday;
      if (dayOffset < 0) dayOffset += 7;
      if (dayOffset < diasMinimosPrimerCobro) dayOffset += 7;
      current.setUTCDate(current.getUTCDate() + dayOffset);
    } else {
      current.setUTCDate(current.getUTCDate() + diasMinimosPrimerCobro);
      while (true) {
        const d = current.getUTCDate();
        const daysInMonth = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
        if (diaCobro === 1) {
          if (d === 1 || d === 16) break;
        } else {
          if (d === 15 || d === daysInMonth) break;
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }
    }

    const totalCuotasEstimadas = isAlquiler ? 999999 : Math.ceil(Number(totalAPagar) / cuotaAmount);

    while (getDateStringInTimezone(current, timezone) <= todayStr && dueDates.length < totalCuotasEstimadas) {
      dueDates.push(getDateStringInTimezone(current, timezone));
      if (isBiweekly) {
        current.setUTCDate(current.getUTCDate() + 14);
      } else {
        do {
          current.setUTCDate(current.getUTCDate() + 1);
          const d = current.getUTCDate();
          const daysInMonth = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
          if (diaCobro === 1) {
            if (d === 1 || d === 16) break;
          } else {
            if (d === 15 || d === daysInMonth) break;
          }
        } while (true);
      }
    }
  } else {
    const targetDay = diaCobro && diaCobro >= 1 && diaCobro <= 31 ? diaCobro : current.getUTCDate();
    current.setUTCMonth(current.getUTCMonth() + 1);
    const maxDaysFirst = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
    current.setUTCDate(Math.min(targetDay, maxDaysFirst));

    const totalCuotasEstimadas = isAlquiler ? 999999 : Math.ceil(Number(totalAPagar) / cuotaAmount);

    while (getDateStringInTimezone(current, timezone) <= todayStr && dueDates.length < totalCuotasEstimadas) {
      dueDates.push(getDateStringInTimezone(current, timezone));
      current.setUTCMonth(current.getUTCMonth() + 1);
      const daysInM = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0)).getUTCDate();
      current.setUTCDate(Math.min(targetDay, daysInM));
    }
  }

  return dueDates;
}
