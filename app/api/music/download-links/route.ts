import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionHash, hashToken } from "@/lib/music/session";
import { MAX_DOWNLOADS, MAX_LINKS_PER_HOUR } from "@/lib/music/download-limits";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sessionHash = await getSessionHash();
  if (!sessionHash) {
    return NextResponse.json({ error: "Open the library in the browser used to complete checkout." }, { status: 401 });
  }
  const body = await request.json().catch(() => null);
  const orderItemId = typeof body?.orderItemId === "string" ? body.orderItemId : "";
  const format = body?.format === "wav" ? "wav" : body?.format === "mp3" ? "mp3" : null;
  if (!/^[A-Za-z0-9_-]{10,40}$/.test(orderItemId) || !format) {
    return NextResponse.json({ error: "Choose a valid purchased track and format." }, { status: 400 });
  }

  const item = await db.musicOrderItem.findFirst({
    where: { id: orderItemId, order: { buyerSessionHash: sessionHash, status: "PAID" } },
    include: { track: true },
  });
  if (item?.track.releaseAt && item.track.releaseAt.getTime() > Date.now()) {
    const when = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(item.track.releaseAt);
    return NextResponse.json({ error: `This release unlocks on ${when}. Your purchase is saved.` }, { status: 403 });
  }
  const path = format === "wav" ? item?.track.wavPath : item?.track.mp3Path;
  if (!item || !path) return NextResponse.json({ error: "That format is not available for this purchase." }, { status: 404 });

  const usedBefore = await db.musicDownloadLink.count({
    where: { orderItemId: item.id, format, usedAt: { not: null, gte: item.downloadsFrom ?? new Date(0) } },
  });
  if (usedBefore >= MAX_DOWNLOADS) {
    return NextResponse.json({ error: `You have used all ${MAX_DOWNLOADS} downloads of this file. Contact Fish Guy and we will reset them.` }, { status: 403 });
  }
  const recent = await db.musicDownloadLink.count({ where: { orderItemId: item.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (recent >= MAX_LINKS_PER_HOUR) {
    return NextResponse.json({ error: "Too many download attempts. Please try again in an hour." }, { status: 429 });
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db.musicDownloadLink.create({ data: { orderItemId: item.id, tokenHash: hashToken(token), format, expiresAt } });
  return NextResponse.json({ url: `/api/music/downloads/${token}`, expiresAt: expiresAt.toISOString(), remaining: MAX_DOWNLOADS - usedBefore - 1 }, { status: 201 });
}
