import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lagosNow } from "@/lib/delivery";
import { parseAttribution, sourceKey } from "@/lib/attribution";

const TYPES = new Set(["VISIT", "ADD_TO_CART", "CHECKOUT_STARTED"]);
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse/i;

// Anonymous funnel counting: one row per visit id, step and day. No name, phone or email is ever sent here.
export async function POST(req: Request) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new NextResponse(null, { status: 204 });
  const b = (await req.json().catch(() => null)) as { type?: unknown; sid?: unknown } | null;
  if (!b || typeof b.type !== "string" || !TYPES.has(b.type) || typeof b.sid !== "string" || !/^[a-f0-9]{16,32}$/.test(b.sid)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const a = parseAttribution(req.headers.get("cookie"));
  try {
    await db.funnelEvent.createMany({
      data: [{ sid: b.sid, type: b.type, day: lagosNow().date, source: sourceKey(a.source, a.ref), campaign: a.campaign || null, ref: a.ref || null }],
      skipDuplicates: true,
    });
  } catch (e) {
    console.error("funnel event failed", e);
  }
  return new NextResponse(null, { status: 204 });
}
