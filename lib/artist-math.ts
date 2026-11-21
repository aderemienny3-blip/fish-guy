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
