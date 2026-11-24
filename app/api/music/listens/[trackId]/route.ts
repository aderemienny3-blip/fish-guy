import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { lagosDateOf } from "@/lib/admin/format";
import { geoFrom } from "@/lib/geo";
import { canHearFull } from "@/lib/music/access";
import { MUSIC_SESSION_COOKIE, createSessionToken, hashToken, sessionCookie } from "@/lib/music/session";

export const runtime = "nodejs";

// How long a fan really listened, so artists can see who stays and where people drop off.
// This is engagement data, not money, so it is recorded on trust but capped to sensible values.
export async function POST(request: Request, { params }: { params: Promise<{ trackId: string }> }) {
  const { trackId } = await params;
  const body = await request.json().catch(() => null);
  const seconds = Math.max(0, Math.floor(Number(body?.seconds) || 0));
  const ended = body?.ended === true;
  const id = typeof body?.id === "string" ? body.id : "";

  const track = await db.track.findFirst({
    where: { id: trackId, isPublished: true },
    select: { id: true, artistId: true, durationSeconds: true, isFreeToStream: true, isSuperfanOnly: true, releaseAt: true },
  });
  if (!track) return NextResponse.json({ ok: false }, { status: 404 });

  const existing = (await cookies()).get(MUSIC_SESSION_COOKIE)?.value;
  const token = existing || createSessionToken();
  const listenerHash = hashToken(token);
  const cap = Math.min(seconds, track.durationSeconds + 2);

  let result: { ok: boolean; id?: string };
  if (id) {
    const row = await db.listenEvent.findFirst({ where: { id, trackId, listenerHash } });
    if (!row) return NextResponse.json({ ok: false }, { status: 404 });
    // Finished = the player reached the end AND the fan really heard most of it. A preview only has to reach its own end.
    const finished = ended && (row.isFull ? cap >= track.durationSeconds * 0.8 : true);
    await db.listenEvent.update({
      where: { id: row.id },
      data: { maxSeconds: Math.max(row.maxSeconds, cap), completed: row.completed || finished },
    });
    result = { ok: true };
  } else {
    const day = lagosDateOf(new Date());
    const today = await db.listenEvent.count({ where: { trackId, listenerHash, day } });
    if (today >= 25) return NextResponse.json({ ok: false }, { status: 429 });
    const isFull = await canHearFull(track, hashToken(token));
    const row = await db.listenEvent.create({ data: { trackId, listenerHash, day, maxSeconds: cap, isFull, ...geoFrom(request.headers) } });
    result = { ok: true, id: row.id };
  }

  const res = NextResponse.json(result);
  if (!existing) {
    const c = sessionCookie(request, token);
    res.cookies.set(c.name, c.value, c.options);
  }
  return res;
}
