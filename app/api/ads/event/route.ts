import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { lagosNow } from "@/lib/delivery";

const Body = z.object({ id: z.string().min(1).max(40), type: z.enum(["IMPRESSION", "CLICK"]) });

// Counts UNIQUE viewers per day (one impression and one click per viewer per ad per day), so numbers can't be inflated by refreshing.
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
  const { id, type } = parsed.data;
  const day = lagosNow().date;

  const live = await db.adCampaign.findFirst({ where: { id, status: "PAID", startDate: { lte: day }, endDate: { gte: day } }, select: { id: true } });
  if (!live) return NextResponse.json({ ok: false }, { status: 404 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const viewerHash = crypto.createHash("sha256").update(`${process.env.AUTH_SECRET ?? "fish-guy"}|${ip}|${req.headers.get("user-agent") ?? ""}`).digest("hex").slice(0, 32);
  await db.adEvent.createMany({ data: [{ campaignId: id, type, viewerHash, day }], skipDuplicates: true });
  return NextResponse.json({ ok: true });
}
