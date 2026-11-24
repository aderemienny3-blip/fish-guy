import { db } from "@/lib/db";
import { artistPool, shareOut } from "@/lib/music/split-math";

export const SETTING_ID = "default";
export const getSetting = () => db.payoutSetting.findUnique({ where: { id: SETTING_ID } });

/**
 * Writes each paid sale into the earnings ledger, using the artist share and the track's split sheet at that moment.
 * Safe to run again and again: a sale is only ever recorded once. Does nothing until the artist share has been set.
 */
export async function recordEarnings(orderId?: string): Promise<number> {
  const setting = await getSetting();
  if (!setting) return 0;
  const items = await db.musicOrderItem.findMany({
    where: { ...(orderId ? { orderId } : {}), unitPriceKobo: { gt: 0 }, order: { status: "PAID" }, earnings: { none: {} } },
    select: { id: true, unitPriceKobo: true, track: { select: { artistId: true, splits: { select: { artistId: true, bps: true } } } } },
    take: 2000,
  });
  let made = 0;
  for (const it of items) {
    const rows = shareOut(artistPool(it.unitPriceKobo, setting.artistBps), it.track.artistId, it.track.splits);
    if (rows.length === 0) continue;
    const r = await db.earning.createMany({ data: rows.map((x) => ({ orderItemId: it.id, artistId: x.artistId, amountKobo: x.amountKobo })), skipDuplicates: true });
    made += r.count;
  }
  return made;
}

const PAID_SALE = { orderItem: { order: { status: "PAID" as const } } };

/** What one artist has earned, what they can ask for now, and where the rest is. */
export async function artistLedger(artistId: string) {
  const [rows, payouts, splitsIn] = await Promise.all([
    db.earning.findMany({
      where: { artistId, ...PAID_SALE },
      select: { amountKobo: true, payout: { select: { status: true } }, orderItem: { select: { track: { select: { id: true, title: true } } } } },
      take: 20000,
    }),
    db.payout.findMany({ where: { artistId }, orderBy: { requestedAt: "desc" }, take: 20 }),
    db.trackSplit.findMany({ where: { artistId }, select: { bps: true, role: true, track: { select: { title: true, artist: { select: { name: true } } } } } }),
  ]);
  let earned = 0, available = 0, requested = 0, paid = 0;
  const perTrack = new Map<string, { title: string; kobo: number }>();
  for (const r of rows) {
    earned += r.amountKobo;
    if (!r.payout) available += r.amountKobo;
    else if (r.payout.status === "REQUESTED") requested += r.amountKobo;
    else if (r.payout.status === "PAID") paid += r.amountKobo;
    const t = r.orderItem.track;
    const e = perTrack.get(t.id) ?? { title: t.title, kobo: 0 };
    e.kobo += r.amountKobo;
    perTrack.set(t.id, e);
  }
  return { earned, available, requested, paid, perTrack: [...perTrack.values()].sort((a, b) => b.kobo - a.kobo), payouts, splitsIn };
}
