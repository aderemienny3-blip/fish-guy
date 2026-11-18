import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackCard } from "@/components/music/track-card";
import { PlayAll } from "@/components/music/play-all";
import { getPlaylistBySlug } from "@/lib/music/playlists";

export const dynamic = "force-dynamic";

export default async function PlaylistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPlaylistBySlug(slug);
  if (!data || data.tracks.length === 0) notFound();
  return (
    <main className="page-width utility-page">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/playlists">Playlists</Link><span aria-hidden="true">/</span><span>{data.playlist.title}</span></nav>
      <p className="eyebrow">PLAYLIST</p>
      <h1>{data.playlist.title}</h1>
      {data.playlist.description && <p className="utility-intro">{data.playlist.description}</p>}
      <div className="student-actions"><PlayAll tracks={data.tracks} /></div>
      <div className="track-grid" style={{ marginTop: 24 }}>
        {data.tracks.map((t) => <TrackCard key={t.id} track={t} queue={data.tracks} />)}
      </div>
    </main>
  );
}
