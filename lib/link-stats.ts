import { db } from "@/lib/db";
import { PAID_STATUSES } from "@/lib/admin/orders";

export const artistLinkCode = (slug: string) => ("a-" + slug.toLowerCase().replace(/[^a-z0-9-]/g, "")).slice(0, 40);

/** Every artist gets a link to their page. Created the first time it is needed. */
export async function ensureArtistLink(a: { id: string; slug: string; name: string }) {
  const code = artistLinkCode(a.slug);
  return db.trackedLink.upsert({ where: { code }, update: {}, create: { code, label: a.name, kind: "ARTIST", destination: `/artists/${a.slug}`, artistId: a.id } });
}

export type LinkResults = { clicks: number; visitors: number; shopOrders: number; shopKobo: number; musicOrders: number; musicKobo: number; lastClick: Date | null };

/** What one tracked link or code has brought in. */
export async function linkResults(code: string): Promise<LinkResults> {
  const [clicks, visitors, shop, music, last] = await Promise.all([
    db.linkClick.count({ where: { code } }),
    db.funnelEvent.count({ where: { ref: code, type: "VISIT" } }),
    db.order.aggregate({ where: { refCode: code, status: { in: PAID_STATUSES } }, _count: { _all: true }, _sum: { totalKobo: true } }),
    db.musicOrder.aggregate({ where: { refCode: code, status: "PAID" }, _count: { _all: true }, _sum: { amountKobo: true } }),
    db.linkClick.findFirst({ where: { code }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  return { clicks, visitors, shopOrders: shop._count._all, shopKobo: shop._sum.totalKobo ?? 0, musicOrders: music._count._all, musicKobo: music._sum.amountKobo ?? 0, lastClick: last?.createdAt ?? null };
}
