import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Returns the CURRENT price and stock for items in a customer's cart (the cart itself lives in their browser).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]).filter((x): x is string => typeof x === "string").slice(0, 60) : [];
  if (ids.length === 0) return NextResponse.json({ products: [] });
  const rows = await db.product.findMany({
    where: { id: { in: ids }, active: true },
    select: { id: true, slug: true, name: true, priceKobo: true, unit: true, stockQty: true, imageUrl: true, cartonKg: true },
  });
  return NextResponse.json({ products: rows }, { headers: { "Cache-Control": "no-store" } });
}
