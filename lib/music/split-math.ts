// Money split. All amounts are whole kobo. Percentages are stored as basis points: 100% = 10,000.
export const BPS = 10_000;
export const MIN_MAIN_BPS = 100; // the main artist always keeps at least 1% of the artist share
export const MIN_PAYOUT_FLOOR_KOBO = 100_000; // the smallest minimum payout an admin can set: ₦1,000

/** "12.5" or "12.5%" becomes 1250. Returns null for anything that is not a number between 0.01 and 100. */
export function percentToBps(raw: string): number | null {
  const n = Number(raw.replace(/[%\s]/g, ""));
  if (!Number.isFinite(n) || n <= 0 || n > 100) return null;
  const bps = Math.round(n * 100);
  return bps >= 1 ? bps : null;
}
export const bpsToPercent = (bps: number) => `${bps / 100}%`;

/** The artists' side of one sale: the sale price times the artist share. */
export const artistPool = (priceKobo: number, artistBps: number) => Math.floor((priceKobo * artistBps) / BPS);

/** Collaborators' shares must leave the main artist at least MIN_MAIN_BPS. */
export const splitsAreValid = (collab: { bps: number }[]) => collab.every((c) => c.bps >= 1) && collab.reduce((n, c) => n + c.bps, 0) <= BPS - MIN_MAIN_BPS;

/**
 * Shares one sale among the main artist and the collaborators. Each collaborator gets their percentage of the pool (rounded down);
 * the main artist gets everything left, so the parts always add up to the pool exactly.
 */
export function shareOut(pool: number, mainArtistId: string, collab: { artistId: string; bps: number }[]): { artistId: string; amountKobo: number }[] {
  const others = collab.filter((c) => c.artistId !== mainArtistId).map((c) => ({ artistId: c.artistId, amountKobo: Math.floor((pool * c.bps) / BPS) }));
  const main = pool - others.reduce((n, o) => n + o.amountKobo, 0);
  return [{ artistId: mainArtistId, amountKobo: main }, ...others].filter((r) => r.amountKobo > 0);
}
