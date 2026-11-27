import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Delivery areas and fees, so the cart can show a fee before checkout.
export async function GET() {
  const zones = await db.deliveryZone.findMany({ where: { active: true, isPickup: false }, orderBy: { name: "asc" }, select: { id: true, name: true, feeKobo: true, freeOverKobo: true } });
  return NextResponse.json({ zones }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
