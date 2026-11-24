import { db } from "@/lib/db";
import { lagosDateOf } from "@/lib/admin/format";
import { placeKey, placeLabel } from "@/lib/geo";
import { dailySeries, engagement, firstName, rankFans, tally } from "@/lib/artist-math";

const WINDOW_DAYS = 30;

/** Everyone who bought from this artist, ranked. An email is present only if the fan did not keep it private. */
export async function getFanList(artistId: string) {
  const items = await db.musicOrderItem.findMany({
    where: { track: { artistId }, order: { status: "PAID" } },
    select: {
      orderId: true, trackId: true, unitPriceKobo: true,
      order: { select: { buyerName: true, buyerEmail: true, shareWithArtist: true, paidAt: true, country: true, region: true, city: true } },
    },
  });
  return rankFans(
    items.map((i) => ({
      email: i.order.buyerEmail, name: i.order.buyerName, shareable: i.order.shareWithArtist,
      orderId: i.orderId, trackId: i.trackId, amountKobo: i.unitPriceKobo, paidAt: i.order.paidAt, place: placeLabel(i.order),
    })),
  );
}

export async function artistStats(artistId: string) {
  const today = lagosDateOf(new Date());
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);

  const [tracks, playsTotal, plays, items, listens, fans] = await Promise.all([
    db.track.findMany({ where: { artistId }, select: { id: true, title: true, isPublished: true, isSuperfanOnly: true }, orderBy: { createdAt: "desc" } }),
    db.musicPlay.count({ where: { track: { artistId } } }),
    db.musicPlay.findMany({
      where: { track: { artistId }, playedAt: { gte: since } },
      select: { trackId: true, listenerHash: true, playDay: true, country: true, region: true },
    }),
    db.musicOrderItem.findMany({
      where: { track: { artistId }, order: { status: "PAID" } },
      orderBy: { order: { paidAt: "desc" } },
      select: {
        orderId: true, trackId: true, unitPriceKobo: true, editionNo: true,
        order: { select: { buyerName: true, buyerEmail: true, shareWithArtist: true, paidAt: true, country: true, region: true, city: true } },
      },
    }),
    db.listenEvent.findMany({
      where: { track: { artistId }, startedAt: { gte: since } },
      select: { trackId: true, listenerHash: true, day: true, maxSeconds: true, completed: true, isFull: true },
    }),
    getFanList(artistId),
  ]);

  const titleOf = new Map(tracks.map((t) => [t.id, t.title]));
  const sales30 = items.filter((i) => i.order.paidAt && i.order.paidAt >= since);
  const eng = engagement(listens);

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
    engagement: { ...eng, perTrack: undefined },
    playSeries: dailySeries(today, WINDOW_DAYS, playCounts),
    saleSeries: dailySeries(today, WINDOW_DAYS, saleCounts),
    playPlaces: tally(plays, (p) => placeKey(p)).slice(0, 8),
    salePlaces: tally(items, (i) => placeKey(i.order)).slice(0, 8),
    fans,
    perTrack: tracks.map((t) => ({
      id: t.id,
      title: t.title,
      live: t.isPublished,
      exclusive: t.isSuperfanOnly,
      plays30: plays.filter((p) => p.trackId === t.id).length,
      reachedPct: eng.perTrack.get(t.id)?.reachedPct ?? null,
      finishedPct: eng.perTrack.get(t.id)?.finishedPct ?? null,
      sales: items.filter((i) => i.trackId === t.id).length,
      revenueKobo: items.filter((i) => i.trackId === t.id).reduce((n, i) => n + i.unitPriceKobo, 0),
    })),
    recentSales: items.slice(0, 25).map((i) => ({
      track: titleOf.get(i.trackId) ?? "Track",
      when: i.order.paidAt,
      amountKobo: i.unitPriceKobo,
      editionNo: i.editionNo,
      buyer: firstName(i.order.buyerName),
      place: placeLabel(i.order),
    })),
  };
}
