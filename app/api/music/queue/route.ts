import { NextResponse } from "next/server";
import { getSoundsPageData } from "@/lib/music/data";
import { getShopPlaylistTracks } from "@/lib/music/playlists";

export const dynamic = "force-dynamic";

/**
 * The tracks the Play button plays. Only published, playable tracks.
 * ?id=TRACK_ID returns just that track (used by promoted songs).
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const data = await getSoundsPageData();
  const playable = data.tracks.filter((t) => t.canPlay);

  if (id) return NextResponse.json({ tracks: playable.filter((t) => t.id === id) }, { headers: { "Cache-Control": "no-store" } });

  const curated = await getShopPlaylistTracks();
  if (curated.length) return NextResponse.json({ tracks: curated }, { headers: { "Cache-Control": "no-store" } });
  const free = playable.filter((t) => t.isFreeToStream).sort((a, b) => b.playCount - a.playCount);
  const rest = playable.filter((t) => !t.isFreeToStream).sort((a, b) => b.playCount - a.playCount);
  return NextResponse.json({ tracks: [...free, ...rest].slice(0, 50) }, { headers: { "Cache-Control": "no-store" } });
}
