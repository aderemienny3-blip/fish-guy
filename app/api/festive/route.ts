import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActivePromo } from "@/lib/festive";

export const dynamic = "force-dynamic";

// Public: the festive offer that is live right now (or null), used by the pop-up, ribbon and cart.
export async function GET() {
  const promo = await getActivePromo();
  let cartonProducts: { id: string; cartonKg: number }[] = [];
  if (promo) {
    try {
      const rows = await db.product.findMany({ where: { active: true, unit: "kg", cartonKg: { not: null } }, select: { id: true, cartonKg: true } });
      cartonProducts = rows.flatMap((r) => (r.cartonKg ? [{ id: r.id, cartonKg: r.cartonKg }] : []));
    } catch { /* leave empty */ }
  }
  return NextResponse.json({ promo, cartonProducts }, { headers: { "Cache-Control": "no-store" } });
}
