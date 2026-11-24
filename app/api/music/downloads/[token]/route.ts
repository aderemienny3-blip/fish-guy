import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionHash, hashToken } from "@/lib/music/session";
import { crossSite } from "@/lib/music/guard";
import { geoFrom } from "@/lib/geo";
import { copyrightLine } from "@/lib/copyright";
import { buildTags, tagMp3 } from "@/lib/music/tags";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (crossSite(req)) return NextResponse.json({ error: "Open this link from the Fish Guy website." }, { status: 403 });
  const sessionHash = await getSessionHash();
  const bad = () => NextResponse.json({ error: "Download link is invalid or expired." }, { status: 404 });
  if (!sessionHash || !/^[A-Za-z0-9_-]{40,50}$/.test(token)) return bad();

  const link = await db.musicDownloadLink.findFirst({
    where: {
      tokenHash: hashToken(token),
      expiresAt: { gt: new Date() },
      orderItem: { order: { buyerSessionHash: sessionHash, status: "PAID" } },
    },
    include: { orderItem: { include: { order: true, track: { include: { artist: true } } } } },
  });
  const track = link?.orderItem.track;
  const path = link?.format === "wav" ? track?.wavPath : track?.mp3Path;
  if (!link || !track || !path) return bad();
  const where = geoFrom(req.headers);
  await db.musicDownloadLink.updateMany({ where: { id: link.id, usedAt: null }, data: { usedAt: new Date(), country: where.country, region: where.region } });

  try {
    const blob = await get(path, { access: "private" });
    if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: "The audio file is no longer available." }, { status: 404 });
    const ext = link.format === "wav" ? "wav" : "mp3";
    const safe = track.title.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 100) || "fish-guy-track";
    let body: BodyInit = blob.stream;
    let length = "";
    if (ext === "mp3") {
      const raw = Buffer.from(await new Response(blob.stream).arrayBuffer());
      let cover: { buffer: Buffer; mime: string } | null = null;
      if (track.coverPath) {
        try {
          const c = await get(track.coverPath, { access: "private" });
          if (c && c.statusCode === 200) {
            const buf = Buffer.from(await new Response(c.stream).arrayBuffer());
            if (buf.length <= 3_000_000) cover = { buffer: buf, mime: c.blob.contentType || "image/jpeg" };
          }
        } catch { /* the song still downloads without a cover */ }
      }
      const year = track.copyrightYear ?? (track.releasedAt ?? track.createdAt).getFullYear();
      const tagged = tagMp3(raw, buildTags({
        title: track.title, artist: track.artist.name, genre: track.genre, isrc: track.isrc, year, cover,
        copyright: copyrightLine({ owner: track.copyrightOwner, year: track.copyrightYear, fallbackOwner: track.artist.name, fallbackYear: year }),
        orderRef: link.orderItem.order.reference,
      }));
      body = new Uint8Array(tagged);
      length = String(tagged.length);
    }
    return new NextResponse(body, {
      headers: {
        "Content-Type": blob.blob.contentType || (ext === "wav" ? "audio/wav" : "audio/mpeg"),
        "Content-Disposition": `attachment; filename="${safe}.${ext}"`,
        "Cache-Control": "private, no-store",
        ...(length ? { "Content-Length": length } : {}),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "The audio file is temporarily unavailable." }, { status: 503 });
  }
}
