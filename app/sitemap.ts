import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/seo";
import { getSiteFlags } from "@/lib/site-flags";
import { slugifyCategory } from "@/lib/shop/format";

export const dynamic = "force-dynamic";

const PAGES = ["", "/shop", "/business", "/bulk", "/sounds", "/delivery-refunds", "/contact", "/student", "/advertise", "/terms", "/privacy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const out: MetadataRoute.Sitemap = PAGES.map((p) => ({ url: base + p, changeFrequency: p === "" || p === "/shop" ? "daily" : "monthly", priority: p === "" ? 1 : p === "/shop" || p === "/business" ? 0.9 : 0.5 }));
  try {
    const [products, tracks, artists] = await Promise.all([
      db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true, category: true, isAddOn: true } }),
      db.track.findMany({ where: { isPublished: true }, select: { slug: true } }),
      db.artist.findMany({ select: { slug: true } }),
    ]);
    for (const p of products) out.push({ url: `${base}/shop/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily", priority: 0.8 });
    for (const slug of new Set(products.filter((p) => p.category && !p.isAddOn).map((p) => slugifyCategory(p.category as string)))) out.push({ url: `${base}/category/${slug}`, changeFrequency: "daily", priority: 0.8 });
    for (const t of tracks) out.push({ url: `${base}/sounds/${t.slug}`, changeFrequency: "weekly", priority: 0.4 });
    for (const a of artists) out.push({ url: `${base}/artists/${a.slug}`, changeFrequency: "weekly", priority: 0.4 });
  } catch (e) {
    console.error("sitemap: database unavailable, listing the fixed pages only", e);
  }
  if (!(await getSiteFlags()).music) return out.filter((e) => !/\/(sounds|artists)(\/|$)/.test(e.url));
  return out;
}
