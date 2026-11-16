import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionHash, hashToken } from "@/lib/music/session";

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
  const path = format === "wav" ? item?.track.wavPath : item?.track.mp3Path;
  if (!item || !path) return NextResponse.json({ error: "That format is not available for this purchase." }, { status: 404 });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db.musicDownloadLink.create({ data: { orderItemId: item.id, tokenHash: hashToken(token), format, expiresAt } });
  return NextResponse.json({ url: `/api/music/downloads/${token}`, expiresAt: expiresAt.toISOString() }, { status: 201 });
}
