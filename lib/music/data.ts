import { db } from "@/lib/db";

export type MusicTrack = {
  id: string;
  slug: string;
  title: string;
  genre: string;
  mood: string | null;
  coverImageUrl: string | null;
  priceKobo: number;
  durationSeconds: number;
  isFreeToStream: boolean;
  canPlay: boolean;
  artistName: string;
  artistSlug: string;
  artistImageUrl: string | null;
  playCount: number;
};

export type MusicArtist = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  isFeatured: boolean;
};

export const GENRES = ["Afrobeats-hip-hop", "Street rap", "Drill", "Trap", "Boom bap"];

const withArtist = { artist: true } as const;

type Row = Awaited<ReturnType<typeof loadTracks>>[number];

function loadTracks(where: object) {
  return db.track.findMany({
    where,
    include: withArtist,
    orderBy: [{ releasedAt: "desc" }, { createdAt: "desc" }],
  });
}

function toView(t: Row, playCount = 0): MusicTrack {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    genre: t.genre,
    mood: t.mood,
    coverImageUrl: t.coverPath ? `/api/music/cover/${t.id}` : null,
    priceKobo: t.priceKobo,
    durationSeconds: t.durationSeconds,
    isFreeToStream: t.isFreeToStream,
    canPlay: t.isFreeToStream ? Boolean(t.mp3Path) : Boolean(t.previewPath),
    artistName: t.artist.name,
    artistSlug: t.artist.slug,
    artistImageUrl: t.artist.imageUrl,
    playCount,
  };
}

export async function getSoundsPageData(genre?: string) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [rows, featured, plays] = await Promise.all([
    loadTracks({ isPublished: true }),
    db.artist.findFirst({ where: { isFeatured: true }, orderBy: { createdAt: "desc" } }),
    db.musicPlay.groupBy({ by: ["trackId"], where: { playedAt: { gte: since } }, _count: { _all: true } }),
  ]);
  const counts = new Map(plays.map((p) => [p.trackId, p._count._all]));
  const all = rows.map((r) => toView(r, counts.get(r.id) ?? 0));
  const tracks = genre ? all.filter((t) => t.genre.toLowerCase() === genre.toLowerCase()) : all;
  return {
    featuredArtist: featured as MusicArtist | null,
    tracks,
    newReleases: tracks.slice(0, 8),
    trending: tracks.filter((t) => t.playCount > 0).sort((a, b) => b.playCount - a.playCount).slice(0, 8),
    hasPublishedTracks: all.length > 0,
  };
}

export async function getTrackBySlug(slug: string) {
  const t = await db.track.findFirst({ where: { slug, isPublished: true }, include: withArtist });
  return t ? toView(t) : null;
}

export async function getArtistBySlug(slug: string) {
  const artist = await db.artist.findUnique({ where: { slug } });
  if (!artist) return null;
  const rows = await loadTracks({ artistId: artist.id, isPublished: true });
  return { artist: artist as MusicArtist, tracks: rows.map((r) => toView(r)) };
}

export async function getLibraryItems(sessionHash: string) {
  const items = await db.musicOrderItem.findMany({
    where: { order: { buyerSessionHash: sessionHash, status: "PAID" } },
    include: { order: true, track: { include: withArtist } },
    orderBy: { order: { paidAt: "desc" } },
  });
  return items.map((i) => ({
    orderItemId: i.id,
    title: i.track.title,
    slug: i.track.slug,
    artistName: i.track.artist.name,
    coverImageUrl: i.track.coverPath ? `/api/music/cover/${i.track.id}` : null,
    priceKobo: i.unitPriceKobo,
    purchasedAt: i.order.paidAt,
    hasMp3: Boolean(i.track.mp3Path),
    hasWav: Boolean(i.track.wavPath),
  }));
}
