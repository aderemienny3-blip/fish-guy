import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// Cover art lives in the private blob store; this route is the only public way to see it.
export async function GET(_req: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  const track = await db.track.findFirst({ where: { id: trackId, isPublished: true }, select: { coverPath: true } });
  if (!track?.coverPath) return new NextResponse(null, { status: 404 });
  try {
    const r = await get(track.coverPath, { access: "private" });
    if (!r || !r.stream) return new NextResponse(null, { status: 404 });
    return new NextResponse(r.stream, {
      headers: {
        "Content-Type": r.blob.contentType || "image/jpeg",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
