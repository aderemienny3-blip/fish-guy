/** Discount applies to food only, never delivery. Safe to import in the browser. */
export function discountFor(subtotalKobo: number, percent: number, maxKobo: number | null) {
  if (percent <= 0 || subtotalKobo <= 0) return 0;
  const raw = Math.round((subtotalKobo * percent) / 100);
  return maxKobo !== null ? Math.min(raw, maxKobo) : raw;
}
