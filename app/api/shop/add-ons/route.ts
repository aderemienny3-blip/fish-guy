import { NextResponse } from "next/server";
import { getAddOns } from "@/lib/shop/addons";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getAddOns();
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
