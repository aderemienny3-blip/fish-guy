import { db } from "@/lib/db";
import { getSoundsPageData, type MusicTrack } from "@/lib/music/data";

export type PlaylistSummary = { id: string; slug: string; title: string; description: string | null; trackCount: number; coverImageUrl: string | null };

/** Tracks of one playlist, in the order YOU arranged them. Only published, playable tracks are shown. */
async function tracksFor(playlistId: string): Promise<MusicTrack[]> {
  const [entries, all] = await Promise.all([
    db.playlistTrack.findMany({ where: { playlistId }, orderBy: { position: "asc" }, select: { trackId: true } }),
    getSoundsPageData(),
  ]);
  const byId = new Map(all.tracks.map((t) => [t.id, t]));
  return entries.map((e) => byId.get(e.trackId)).filter((t): t is MusicTrack => !!t);
}

export async function getPublishedPlaylists(): Promise<PlaylistSummary[]> {
  const lists = await db.playlist.findMany({ where: { isPublished: true }, orderBy: { updatedAt: "desc" } });
  const out: PlaylistSummary[] = [];
  for (const p of lists) {
    const tracks = await tracksFor(p.id);
    if (tracks.length === 0) continue;
    out.push({ id: p.id, slug: p.slug, title: p.title, description: p.description, trackCount: tracks.length, coverImageUrl: tracks.find((t) => t.coverImageUrl)?.coverImageUrl ?? null });
  }
  return out;
}

export async function getPlaylistBySlug(slug: string) {
  const p = await db.playlist.findFirst({ where: { slug, isPublished: true } });
  if (!p) return null;
  return { playlist: p, tracks: await tracksFor(p.id) };
}

/** The playlist that plays on the home page while people shop. Never throws. */
export async function getShopPlaylistTracks(): Promise<MusicTrack[]> {
  try {
    const p = await db.playlist.findFirst({ where: { isShopPlaylist: true, isPublished: true } });
    if (!p) return [];
    return (await tracksFor(p.id)).filter((t) => t.canPlay);
  } catch (e) {
    console.error("shop playlist failed", e);
    return [];
  }
}
