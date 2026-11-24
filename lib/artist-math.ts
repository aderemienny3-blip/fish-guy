// Pure helpers for the artist dashboard (no database), so they can be tested on their own.
export const firstName = (full: string) => (full.trim().split(/\s+/)[0] || "A listener").slice(0, 24);

export function tally<T>(rows: T[], key: (r: T) => string, weight: (r: T) => number = () => 1) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + weight(r));
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

/** Daily counts for the last `days` days ending at `today` (YYYY-MM-DD). Missing days are zero. */
export function dailySeries(today: string, days: number, counts: Map<string, number>) {
  const out: { day: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    out.push({ day, value: counts.get(day) ?? 0 });
  }
  return out;
}

export const share = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

// ---- Fans ----
export type FanRow = { email: string; name: string; shareable: boolean; orderId: string; trackId: string; amountKobo: number; paidAt: Date | null; place: string };
export type Tier = "Superfan" | "Repeat buyer" | "New fan";
export type Fan = {
  name: string; email: string | null; tier: Tier; tracks: number; orders: number;
  spentKobo: number; firstAt: Date | null; lastAt: Date | null; place: string;
};

/** 3+ different tracks = Superfan, 2 = Repeat buyer, 1 = New fan. */
export const SUPERFAN_TRACKS = 3;
export const tierFor = (tracks: number): Tier => (tracks >= SUPERFAN_TRACKS ? "Superfan" : tracks === 2 ? "Repeat buyer" : "New fan");

/**
 * Groups purchases by buyer email and ranks by money spent, then tracks bought.
 * The email is exposed only if EVERY purchase by that buyer allowed sharing.
 */
export function rankFans(rows: FanRow[]): Fan[] {
  const by = new Map<string, FanRow[]>();
  for (const r of rows) {
    const k = r.email.trim().toLowerCase();
    by.set(k, [...(by.get(k) ?? []), r]);
  }
  const fans: Fan[] = [];
  for (const [email, list] of by) {
    const sorted = [...list].sort((a, b) => (a.paidAt?.getTime() ?? 0) - (b.paidAt?.getTime() ?? 0));
    const tracks = new Set(list.map((r) => r.trackId)).size;
    fans.push({
      name: firstName(sorted[sorted.length - 1].name),
      email: list.every((r) => r.shareable) ? email : null,
      tier: tierFor(tracks),
      tracks,
      orders: new Set(list.map((r) => r.orderId)).size,
      spentKobo: list.reduce((n, r) => n + r.amountKobo, 0),
      firstAt: sorted[0].paidAt,
      lastAt: sorted[sorted.length - 1].paidAt,
      place: sorted[sorted.length - 1].place,
    });
  }
  return fans.sort((a, b) => b.spentKobo - a.spentKobo || b.tracks - a.tracks || a.name.localeCompare(b.name));
}

/** Stops spreadsheet programs from running a cell as a formula. */
export const csvCell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// ---- Engagement ----
export type ListenRow = { trackId: string; listenerHash: string; day: string; maxSeconds: number; completed: boolean; isFull: boolean };
export const MIN_SAMPLE = 10; // below this many listens a percentage means nothing, so we show "not enough data"
const pct = (n: number, d: number) => (d >= MIN_SAMPLE ? Math.round((n / d) * 100) : null);
const median = (xs: number[]) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

export function engagement(rows: ListenRow[]) {
  const reached = (r: ListenRow) => r.maxSeconds >= 30 || r.completed;
  const full = rows.filter((r) => r.isFull);
  const daysBy = new Map<string, Set<string>>();
  for (const r of rows) daysBy.set(r.listenerHash, (daysBy.get(r.listenerHash) ?? new Set()).add(r.day));
  const listeners = daysBy.size;
  const repeat = [...daysBy.values()].filter((d) => d.size >= 2).length;

  const perTrack = new Map<string, { starts: number; reachedPct: number | null; finishedPct: number | null }>();
  const ids = new Set(rows.map((r) => r.trackId));
  for (const id of ids) {
    const mine = rows.filter((r) => r.trackId === id);
    const mineFull = mine.filter((r) => r.isFull);
    perTrack.set(id, {
      starts: mine.length,
      reachedPct: pct(mine.filter(reached).length, mine.length),
      finishedPct: pct(mineFull.filter((r) => r.completed).length, mineFull.length),
    });
  }
  return {
    starts: rows.length,
    listeners,
    reachedPct: pct(rows.filter(reached).length, rows.length),
    finishedPct: pct(full.filter((r) => r.completed).length, full.length),
    fullListens: full.length,
    repeatPct: pct(repeat, listeners),
    repeatListeners: repeat,
    // Where people who did not finish a full track usually stop listening (seconds).
    typicalDropoffSeconds: full.filter((r) => !r.completed).length >= MIN_SAMPLE ? median(full.filter((r) => !r.completed).map((r) => r.maxSeconds)) : null,
    perTrack,
  };
}
