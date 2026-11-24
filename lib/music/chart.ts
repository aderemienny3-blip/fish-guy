import { db } from "@/lib/db";
import type { MusicTrack } from "@/lib/music/data";
import { rankChart } from "@/lib/music/chart-math";

/** The real Top 10 for the last 30 days, built from plays and paid purchases. Empty until people listen. */
export async function getTopTen(tracks: MusicTrack[]) {
  if (tracks.length === 0) return [];
  const since = new Date(Date.now() - 30 * 86_400_000);
  const ids = tracks.map((t) => t.id);
  const [plays, sales] = await Promise.all([
    db.musicPlay.groupBy({ by: ["trackId"], where: { trackId: { in: ids }, playedAt: { gte: since } }, _count: { _all: true } }),
    db.musicOrderItem.groupBy({ by: ["trackId"], where: { trackId: { in: ids }, order: { status: "PAID", paidAt: { gte: since } } }, _count: { _all: true } }),
  ]);
  const p = new Map(plays.map((r) => [r.trackId, r._count._all]));
  const s = new Map(sales.map((r) => [r.trackId, r._count._all]));
  const byId = new Map(tracks.map((t) => [t.id, t]));
  return rankChart(tracks.map((t) => ({ id: t.id, title: t.title, plays: p.get(t.id) ?? 0, sales: s.get(t.id) ?? 0 })))
    .map((r) => ({ track: byId.get(r.id)!, plays: r.plays, sales: r.sales, rank: r.rank }));
}

/** Whether this browser has bought anything, so "Open my library" only shows to returning buyers. */
export async function hasLibrary(sessionHash: string | null) {
  if (!sessionHash) return false;
  return (await db.musicOrder.count({ where: { buyerSessionHash: sessionHash, status: "PAID" } })) > 0;
}
