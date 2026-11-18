import type { AdPlacement } from "@prisma/client";
import { db } from "@/lib/db";
import { lagosNow } from "@/lib/delivery";

export type AdView = {
  id: string;
  placement: string;
  artistName: string;
  headline: string;
  tagline: string | null;
  href: string;
  external: boolean;
  imageSrc: string | null;
  trackId?: string | null;
};

export const adImageSrc = (path: string | null) => (path ? `/api/ads/image?p=${encodeURIComponent(path)}` : null);

/** Campaigns that are paid and inside their dates today (Lagos). Never throws: ads must not break the shop. */
export async function liveCampaigns(placement: AdPlacement): Promise<AdView[]> {
  try {
    const today = lagosNow().date;
    const rows = await db.adCampaign.findMany({
      where: { status: "PAID", placement, startDate: { lte: today }, endDate: { gte: today } },
      orderBy: { paidAt: "asc" },
    });
    const ids = rows.map((r) => r.trackId).filter((x): x is string => !!x);
    const tracks = ids.length ? await db.track.findMany({ where: { id: { in: ids }, isPublished: true }, select: { id: true, slug: true } }) : [];
    const slug = new Map(tracks.map((t) => [t.id, t.slug]));
    const out: AdView[] = [];
    for (const r of rows) {
      const s = r.trackId ? slug.get(r.trackId) : undefined;
      const href = s ? `/sounds/${s}` : r.linkUrl;
      if (!href) continue;
      out.push({ id: r.id, placement: r.placement, artistName: r.artistName, headline: r.headline, tagline: r.tagline, href, external: !s, imageSrc: adImageSrc(r.imagePath), trackId: s ? r.trackId : null });
    }
    return out;
  } catch (e) {
    console.error("liveCampaigns failed", e);
    return [];
  }
}
