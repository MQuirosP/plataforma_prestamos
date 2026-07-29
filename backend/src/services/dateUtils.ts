/**
 * Utility module for multi-tenant, timezone-aware date calculations.
 * Avoids any hardcoded defaults or global server process.env.TZ reliance.
 * All functions operate strictly on standard IANA timezone identifiers passed from BusinessSettings (e.g. 'America/Costa_Rica', 'America/Mexico_City').
 */

/**
 * Returns a YYYY-MM-DD string representation of a given Date in a target IANA timezone.
 */
export function getDateStringInTimezone(date: Date | string, timezone: string): string {
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
    // Fallback if timezone string is invalid
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
  const startMidnight = getMidnightInTimezone(startDate, timezone);
  const endMidnight = getMidnightInTimezone(endDate, timezone);

  const diffMs = endMidnight.getTime() - startMidnight.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Determines the current weekday number (1 = Mon, 7 = Sun) for a given date in a target IANA timezone.
 */
export function getWeekdayInTimezone(date: Date | string, timezone: string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short'
    });
    const dayName = formatter.format(d);
    const map: Record<string, number> = {
      'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7
    };
    return map[dayName] || 1;
  } catch {
    const day = d.getDay();
    return day === 0 ? 7 : day;
  }
}
