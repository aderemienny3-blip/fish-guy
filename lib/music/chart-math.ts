// Fish Guy Top 10: a track's score is real plays plus 3 points for each paid purchase, last 30 days.
export const SALE_WEIGHT = 3;
export const CHART_SIZE = 10;

export type ChartInput = { id: string; title: string; plays: number; sales: number };

export const chartScore = (c: { plays: number; sales: number }) => c.plays + c.sales * SALE_WEIGHT;

/** Highest score first. Ties go to more sales, then to the title so the order never jumps around. Tracks with no activity are left off. */
export function rankChart<T extends ChartInput>(items: T[], size = CHART_SIZE): (T & { score: number; rank: number })[] {
  return items
    .map((c) => ({ ...c, score: chartScore(c) }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || b.sales - a.sales || a.title.localeCompare(b.title))
    .slice(0, size)
    .map((c, i) => ({ ...c, rank: i + 1 }));
}
