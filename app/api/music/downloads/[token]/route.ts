import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionHash, hashToken } from "@/lib/music/session";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sessionHash = await getSessionHash();
  const bad = () => NextResponse.json({ error: "Download link is invalid or expired." }, { status: 404 });
  if (!sessionHash || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return bad();

  const link = await db.musicDownloadLink.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
      orderItem: { order: { buyerSessionHash: sessionHash, status: "PAID" } },
    },
    include: { orderItem: { include: { track: true } } },
  });
  const track = link?.orderItem.track;
  const path = link?.format === "wav" ? track?.wavPath : track?.mp3Path;
  if (!link || !track || !path) return bad();

  try {
    const blob = await get(path, { access: "private" });
    if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: "The audio file is no longer available." }, { status: 404 });
    const ext = link.format === "wav" ? "wav" : "mp3";
    const safe = track.title.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "fish-guy-track";
    return new NextResponse(blob.stream, {
      headers: {
        "Content-Type": blob.blob.contentType || (ext === "wav" ? "audio/wav" : "audio/mpeg"),
        "Content-Disposition": `attachment; filename="${safe}.${ext}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "The audio file is temporarily unavailable." }, { status: 503 });
  }
}
