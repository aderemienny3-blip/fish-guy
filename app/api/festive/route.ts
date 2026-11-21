import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdmin } from "@/lib/admin/auth";
import { getActivePromo, getPreviewPromo } from "@/lib/festive";

export const dynamic = "force-dynamic";

// Public: the festive offer that is live right now (or null), used by the pop-up, ribbon and cart.
// With ?preview=1 and a signed-in admin, returns the saved offer even if it is off or not started yet.
export async function GET(req: Request) {
  const wantsPreview = new URL(req.url).searchParams.get("preview") === "1";
  const promo = wantsPreview && (await getAdmin()) ? await getPreviewPromo() : await getActivePromo();
  let cartonProducts: { id: string; cartonKg: number }[] = [];
  if (promo) {
    try {
      const rows = await db.product.findMany({ where: { active: true, unit: "kg", cartonKg: { not: null } }, select: { id: true, cartonKg: true } });
      cartonProducts = rows.flatMap((r) => (r.cartonKg ? [{ id: r.id, cartonKg: r.cartonKg }] : []));
    } catch { /* leave empty */ }
  }
  return NextResponse.json({ promo, cartonProducts }, { headers: { "Cache-Control": "no-store" } });
}
