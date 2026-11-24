import { db } from "@/lib/db";
import { SUPERFAN_TRACKS } from "@/lib/artist-math";

/** How many different tracks by this artist this browser has paid for. */
export async function boughtTrackCount(sessionHash: string | null, artistId: string): Promise<number> {
  if (!sessionHash) return 0;
  const rows = await db.musicOrderItem.findMany({
    where: { track: { artistId }, order: { buyerSessionHash: sessionHash, status: "PAID" } },
    select: { trackId: true },
  });
  return new Set(rows.map((r) => r.trackId)).size;
}

export async function isSuperfanOf(sessionHash: string | null, artistId: string) {
  return (await boughtTrackCount(sessionHash, artistId)) >= SUPERFAN_TRACKS;
}

type T = { id: string; artistId: string; isFreeToStream: boolean; isSuperfanOnly: boolean; releaseAt: Date | null };

/** The one rule for "does this listener get the full track?". Used by streaming and by listen tracking. */
export async function canHearFull(track: T, sessionHash: string | null): Promise<boolean> {
  if (track.releaseAt && track.releaseAt.getTime() > Date.now()) return false;
  if (track.isSuperfanOnly) return isSuperfanOf(sessionHash, track.artistId);
  if (track.isFreeToStream) return true;
  if (!sessionHash) return false;
  return Boolean(
    await db.musicOrderItem.findFirst({
      where: { trackId: track.id, order: { buyerSessionHash: sessionHash, status: "PAID" } },
      select: { id: true },
    }),
  );
}
