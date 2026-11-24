import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionHash } from "@/lib/music/session";
import { crossSite } from "@/lib/music/guard";
import { canHearFull } from "@/lib/music/access";

export const runtime = "nodejs";

// Free tracks and buyers get the full file; everyone else gets the 30-second preview.
export async function GET(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  if (crossSite(request)) return NextResponse.json({ error: "Not available." }, { status: 403 });
  const track = await db.track.findFirst({ where: { id: trackId, isPublished: true } });
  if (!track) return NextResponse.json({ error: "Track not found." }, { status: 404 });

  const sessionHash = await getSessionHash();
  const full = await canHearFull(track, sessionHash);
  const path = full ? track.mp3Path : track.previewPath;
  if (!path) return NextResponse.json({ error: "Audio is not available." }, { status: 404 });

  try {
    const range = request.headers.get("range");
    const result = await get(path, { access: "private", headers: range ? { range } : undefined });
    if (!result || !result.stream) return NextResponse.json({ error: "Audio is not available." }, { status: 404 });
    const headers = new Headers({
      "Content-Type": result.blob.contentType || "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const h of ["content-range", "content-length"]) {
      const v = result.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new NextResponse(result.stream, { status: headers.has("content-range") ? 206 : 200, headers });
  } catch {
    return NextResponse.json({ error: "Audio is temporarily unavailable." }, { status: 503 });
  }
}
