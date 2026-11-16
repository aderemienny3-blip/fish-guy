import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { lagosDateOf } from "@/lib/admin/format";
import { MUSIC_SESSION_COOKIE, createSessionToken, hashToken, sessionCookie } from "@/lib/music/session";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  const track = await db.track.findFirst({ where: { id: trackId, isPublished: true }, select: { id: true } });
  if (!track) return NextResponse.json({ recorded: false }, { status: 404 });

  const existing = (await cookies()).get(MUSIC_SESSION_COOKIE)?.value;
  const token = existing || createSessionToken();
  // One counted play per listener, per track, per day.
  const r = await db.musicPlay.createMany({
    data: { trackId: track.id, listenerHash: hashToken(token), playDay: lagosDateOf(new Date()) },
    skipDuplicates: true,
  });
  const res = NextResponse.json({ recorded: r.count > 0 });
  if (!existing) {
    const c = sessionCookie(request, token);
    res.cookies.set(c.name, c.value, c.options);
  }
  return res;
}
