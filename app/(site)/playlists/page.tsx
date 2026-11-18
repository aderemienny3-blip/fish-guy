import Image from "next/image";
import Link from "next/link";
import { getPublishedPlaylists } from "@/lib/music/playlists";

export const dynamic = "force-dynamic";
export const metadata = { title: "Playlists | Fish Guy Sounds" };

export default async function PlaylistsPage() {
  const lists = await getPublishedPlaylists();
  return (
    <main className="page-width utility-page">
      <p className="eyebrow">FISH GUY SOUNDS</p>
      <h1>Playlists</h1>
      <p className="utility-intro">Hand-picked by the Fish Guy team. No algorithms.</p>
      {lists.length === 0 ? (
        <div className="quiet-empty"><span className="quiet-empty-line" /><p>Playlists will appear here soon.</p></div>
      ) : (
        <div className="track-grid">
          {lists.map((p) => (
            <Link key={p.id} href={`/playlists/${p.slug}`} className="playlist-card">
              <span className="playlist-cover">{p.coverImageUrl && <Image src={p.coverImageUrl} alt="" fill sizes="220px" unoptimized />}</span>
              <strong>{p.title}</strong>
              <small>{p.trackCount} track{p.trackCount === 1 ? "" : "s"}</small>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
