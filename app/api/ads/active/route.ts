import { NextResponse } from "next/server";
import { liveCampaigns } from "@/lib/ads/data";
import { PLACEMENTS, type Placement } from "@/lib/ads/labels";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const placement = new URL(req.url).searchParams.get("placement") as Placement | null;
  if (!placement || !PLACEMENTS.includes(placement)) return NextResponse.json({ ads: [] });
  return NextResponse.json({ ads: await liveCampaigns(placement) }, { headers: { "Cache-Control": "no-store" } });
}
