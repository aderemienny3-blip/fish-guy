import { db } from "@/lib/db";
import { lagosDateOf } from "@/lib/admin/format";
import { placeKey, placeLabel } from "@/lib/geo";
import { dailySeries, firstName, tally } from "@/lib/artist-math";

const WINDOW_DAYS = 30;

export async function artistStats(artistId: string) {
  const today = lagosDateOf(new Date());
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

  const [tracks, playsTotal, plays, items] = await Promise.all([
    db.track.findMany({ where: { artistId }, select: { id: true, title: true, isPublished: true, priceKobo: true, isFreeToStream: true }, orderBy: { createdAt: "desc" } }),
    db.musicPlay.count({ where: { track: { artistId } } }),
    db.musicPlay.findMany({
      where: { track: { artistId }, playedAt: { gte: since } },
      select: { trackId: true, listenerHash: true, playDay: true, country: true, region: true },
    }),
    db.musicOrderItem.findMany({
      where: { track: { artistId }, order: { status: "PAID" } },
      orderBy: { order: { paidAt: "desc" } },
      select: {
        trackId: true, unitPriceKobo: true,
        order: { select: { buyerName: true, buyerEmail: true, shareWithArtist: true, paidAt: true, country: true, region: true, city: true } },
      },
    }),
  ]);

  const titleOf = new Map(tracks.map((t) => [t.id, t.title]));
  const sales30 = items.filter((i) => i.order.paidAt && i.order.paidAt >= since);

  const playCounts = new Map<string, number>();
  for (const p of plays) playCounts.set(p.playDay, (playCounts.get(p.playDay) ?? 0) + 1);
  const saleCounts = new Map<string, number>();
  for (const s of sales30) if (s.order.paidAt) saleCounts.set(lagosDateOf(s.order.paidAt), (saleCounts.get(lagosDateOf(s.order.paidAt)) ?? 0) + 1);

  return {
    windowDays: WINDOW_DAYS,
    totals: {
      playsAllTime: playsTotal,
      plays30: plays.length,
      listeners30: new Set(plays.map((p) => p.listenerHash)).size,
      salesAllTime: items.length,
      revenueAllTimeKobo: items.reduce((n, i) => n + i.unitPriceKobo, 0),
      sales30: sales30.length,
      revenue30Kobo: sales30.reduce((n, i) => n + i.unitPriceKobo, 0),
    },
    playSeries: dailySeries(today, WINDOW_DAYS, playCounts),
    saleSeries: dailySeries(today, WINDOW_DAYS, saleCounts),
    playPlaces: tally(plays, (p) => placeKey(p)).slice(0, 8),
    salePlaces: tally(items, (i) => placeKey(i.order)).slice(0, 8),
    perTrack: tracks.map((t) => ({
      id: t.id,
      title: t.title,
      live: t.isPublished,
      plays30: plays.filter((p) => p.trackId === t.id).length,
      sales: items.filter((i) => i.trackId === t.id).length,
      revenueKobo: items.filter((i) => i.trackId === t.id).reduce((n, i) => n + i.unitPriceKobo, 0),
    })),
    recentSales: items.slice(0, 25).map((i) => ({
      track: titleOf.get(i.trackId) ?? "Track",
      when: i.order.paidAt,
      amountKobo: i.unitPriceKobo,
      buyer: firstName(i.order.buyerName),
      place: placeLabel(i.order),
      email: i.order.shareWithArtist ? i.order.buyerEmail : null,
    })),
  };
}
