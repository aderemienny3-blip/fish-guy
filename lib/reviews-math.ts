// Review rules, kept pure so they can be tested.
export const MAX_COMMENT = 500;

/** A whole number from 1 to 5, or null. */
export function clampRating(v: unknown): number | null {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

/** "Ada Okafor" becomes "Ada O." so a review never shows a full name. */
export function reviewerName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  const first = parts[0].slice(0, 20);
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
}

export function summarize(ratings: number[]): { count: number; avg: number } {
  if (ratings.length === 0) return { count: 0, avg: 0 };
  const avg = ratings.reduce((n, r) => n + r, 0) / ratings.length;
  return { count: ratings.length, avg: Math.round(avg * 10) / 10 };
}
