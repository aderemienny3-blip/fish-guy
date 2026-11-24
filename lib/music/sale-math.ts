// Pure helpers for sales rules (no database), so they can be tested on their own.
export const MIN_PWYW_KOBO = 10_000; // N100: the lowest minimum for a pay-what-you-want track
export const MAX_PAY_KOBO = 50_000_000; // N500,000: the most one fan can pay for one track
export const RESERVE_MINUTES = 60; // an unpaid checkout holds a limited-edition copy this long

export const isReleased = (releaseAt: Date | null | undefined, now = new Date()) => !releaseAt || releaseAt.getTime() <= now.getTime();

/** What the fan will be charged. The price always comes from the database; a pay-what-you-want amount is only accepted above the minimum. */
export function chooseAmount(track: { priceKobo: number; payWhatYouWant: boolean }, requested: unknown): { ok: true; kobo: number } | { ok: false; error: string } {
  if (!track.payWhatYouWant) return { ok: true, kobo: track.priceKobo };
  if (requested === undefined || requested === null || requested === "") return { ok: true, kobo: track.priceKobo };
  const n = Number(requested);
  if (!Number.isSafeInteger(n) || n <= 0) return { ok: false, error: "Enter an amount in naira." };
  if (n < track.priceKobo) return { ok: false, error: `The minimum for this track is ₦${(track.priceKobo / 100).toLocaleString("en-NG")}.` };
  if (n > MAX_PAY_KOBO) return { ok: false, error: `The most you can pay for one track is ₦${(MAX_PAY_KOBO / 100).toLocaleString("en-NG")}.` };
  return { ok: true, kobo: n };
}

/** "2026-12-12T18:00" typed as Lagos time (UTC+1, no daylight saving) -> a real Date. */
export function parseLagosLocal(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const t = Date.UTC(y, mo - 1, d, h - 1, mi);
  const back = new Date(t + 3_600_000);
  if (back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null; // e.g. 31 Feb
  return new Date(t);
}
export const toLagosInput = (d: Date | null) => (d ? new Date(d.getTime() + 3_600_000).toISOString().slice(0, 16) : "");

export const formatRelease = (d: Date) =>
  new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(d);

