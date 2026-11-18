import { db } from "@/lib/db";

export type AddOnItem = {
  id: string;
  slug: string;
  name: string;
  priceKobo: number;
  unit: string;
  imageUrl: string | null;
  stockQty: number;
};

/** Real add-on products only (ticked "Add-on" in Admin > Products), in stock and visible. */
export async function getAddOns(): Promise<AddOnItem[]> {
  try {
    return await db.product.findMany({
      where: { active: true, isAddOn: true, stockQty: { gt: 0 } },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true, priceKobo: true, unit: true, imageUrl: true, stockQty: true },
    });
  } catch {
    return [];
  }
}
