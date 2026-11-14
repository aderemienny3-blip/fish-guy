// Lagos is UTC+1 year-round (no DST), so a fixed offset is safe.
const LAGOS_OFFSET_MS = 60 * 60 * 1000;

/** Current Lagos date as YYYY-MM-DD and minutes since midnight. */
export function lagosNow(now = new Date()) {
  const d = new Date(now.getTime() + LAGOS_OFFSET_MS);
  return {
    date: d.toISOString().slice(0, 10),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Bookable dates: today (only if a slot is still ahead) through +MAX days. */
export const MAX_DAYS_AHEAD = 7;

/** Keep at least this long between ordering and the slot opening (cold-chain packing). */
export const MIN_LEAD_MINUTES = 120;

export function isSlotBookable(date: string, slotStartMinute: number, now = new Date()) {
  const today = lagosNow(now);
  if (date < today.date) return false;
  if (date > addDays(today.date, MAX_DAYS_AHEAD)) return false;
  if (date === today.date && slotStartMinute - today.minutes < MIN_LEAD_MINUTES) return false;
  return true;
}

export function deliveryFeeFor(zone: { feeKobo: number; freeOverKobo: number | null }, subtotalKobo: number) {
  if (zone.freeOverKobo !== null && subtotalKobo >= zone.freeOverKobo) return 0;
  return zone.feeKobo;
}
