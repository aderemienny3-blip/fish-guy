import { db } from "@/lib/db";
import type { BundleDef } from "@/lib/bundle-math";

/** Active bundles in the shape checkout needs. */
export async function getBundleDefs(): Promise<BundleDef[]> {
  try {
    const rows = await db.bundle.findMany({ where: { active: true }, include: { items: true } });
    return rows.map((b) => ({ id: b.id, name: b.name, priceKobo: b.priceKobo, items: b.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) }));
  } catch {
    return [];
  }
}

export type BundleCard = {
  id: string; name: string; description: string | null; priceKobo: number; retailKobo: number;
  items: { productId: string; slug: string; name: string; unit: string; priceKobo: number; imageUrl: string | null; quantity: number; maxQty: number }[];
};

/** Bundles a customer can buy right now: every product active and enough in stock. */
export async function getBundleCards(): Promise<BundleCard[]> {
  try {
    const rows = await db.bundle.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, include: { items: { include: { product: true } } } });
    const out: BundleCard[] = [];
    for (const b of rows) {
      if (b.items.length === 0 || b.items.some((i) => !i.product.active || i.product.stockQty < i.quantity)) continue;
      out.push({
        id: b.id, name: b.name, description: b.description, priceKobo: b.priceKobo,
        retailKobo: b.items.reduce((n, i) => n + i.product.priceKobo * i.quantity, 0),
        items: b.items.map((i) => ({ productId: i.productId, slug: i.product.slug, name: i.product.name, unit: i.product.unit, priceKobo: i.product.priceKobo, imageUrl: i.product.imageUrl, quantity: i.quantity, maxQty: Math.min(i.product.stockQty, 200) })),
      });
    }
    return out;
  } catch {
    return [];
  }
}
