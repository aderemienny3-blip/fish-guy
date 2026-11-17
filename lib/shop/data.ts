import { db } from "@/lib/db";
import { slugifyCategory } from "./format";

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  categorySlug: string | null;
  imageUrl: string | null;
  priceKobo: number;
  unit: string;
  stockQty: number;
  mostOrdered: boolean;
};

type Row = Awaited<ReturnType<typeof db.product.findMany>>[number];

const toView = (p: Row, top: Set<string>): ShopProduct => ({
  id: p.id,
  slug: p.slug,
  name: p.name,
  description: p.description,
  category: p.category,
  categorySlug: p.category ? slugifyCategory(p.category) : null,
  imageUrl: p.imageUrl,
  priceKobo: p.priceKobo,
  unit: p.unit,
  stockQty: p.stockQty,
  mostOrdered: top.has(p.id),
});

/** Real "Most ordered" badge: top 3 products by quantity in paid orders over the last 30 days. */
async function topProductIds(): Promise<Set<string>> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await db.orderItem.groupBy({
    by: ["productId"],
    where: { order: { status: { in: ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] }, paidAt: { gte: since } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 3,
  });
  return new Set(rows.filter((r) => (r._sum.quantity ?? 0) > 0).map((r) => r.productId));
}

export async function getShopData(categorySlug?: string) {
  const [rows, top] = await Promise.all([
    db.product.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    topProductIds(),
  ]);
  const all = rows.map((p) => toView(p, top));
  const categories: { label: string; slug: string; count: number }[] = [];
  for (const p of all) {
    if (!p.category || !p.categorySlug) continue;
    const found = categories.find((c) => c.slug === p.categorySlug);
    if (found) found.count++;
    else categories.push({ label: p.category, slug: p.categorySlug, count: 1 });
  }
  const products = categorySlug ? all.filter((p) => p.categorySlug === categorySlug) : all;
  return { products, categories, hasAny: all.length > 0 };
}

export async function getProductBySlug(slug: string) {
  const [p, top] = await Promise.all([db.product.findFirst({ where: { slug, active: true } }), topProductIds()]);
  return p ? toView(p, top) : null;
}
