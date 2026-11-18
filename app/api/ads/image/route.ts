import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// Ad artwork lives in the private store. It is served only while it belongs to a live, approved or pending campaign.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("p") ?? "";
  if (!/^ads\/[A-Za-z0-9._-]{1,150}$/.test(p) || p.includes("..")) return new NextResponse(null, { status: 404 });
  const c = await db.adCampaign.findFirst({ where: { imagePath: p, status: { in: ["SUBMITTED", "APPROVED", "PAID"] } }, select: { id: true } });
  if (!c) return new NextResponse(null, { status: 404 });
  try {
    const r = await get(p, { access: "private" });
    if (!r || !r.stream) return new NextResponse(null, { status: 404 });
    return new NextResponse(r.stream, {
      headers: { "Content-Type": r.blob.contentType || "image/webp", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
