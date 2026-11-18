import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { Banner, Empty, PageHeader, btn, btnDanger, btnGhost, card, input, label } from "@/components/admin/ui";
import { addTrack, deletePlaylist, moveTrack, removeTrack, savePlaylist } from "../actions";

export const dynamic = "force-dynamic";

export default async function PlaylistEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; created?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { id } = await params;
  const { saved, created, error } = await searchParams;
  const p = await db.playlist.findUnique({ where: { id }, include: { tracks: { orderBy: { position: "asc" }, include: { track: { include: { artist: true } } } } } });
  if (!p) notFound();
  const inList = new Set(p.tracks.map((t) => t.trackId));
  const available = (await db.track.findMany({ where: { isPublished: true }, include: { artist: true }, orderBy: { title: "asc" } })).filter((t) => !inList.has(t.id));

  return (
    <>
      <PageHeader title={p.title} subtitle="Arrange the tracks in the order you want them to play." actions={<Link href="/admin/music/playlists" className={btnGhost}>All playlists</Link>} />
      {(saved || created) && <Banner kind="ok">{created ? "Playlist created. Add some tracks below." : "Saved."}</Banner>}
      {error && <Banner>{error}</Banner>}

      <form action={savePlaylist} className={`${card} mb-6 space-y-4 p-5`}>
        <input type="hidden" name="id" value={p.id} />
        <div><label className={label} htmlFor="title">Name</label><input id="title" name="title" defaultValue={p.title} className={input} required /></div>
        <div><label className={label} htmlFor="description">Short description (optional)</label><input id="description" name="description" defaultValue={p.description ?? ""} className={input} maxLength={200} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublished" defaultChecked={p.isPublished} /> Published (visible on the website)</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isShopPlaylist" defaultChecked={p.isShopPlaylist} /> Play this on the home page while people shop (only one playlist can do this)</label>
        <button className={btn}>Save</button>
      </form>

      <h2 className="mb-3 font-serif text-xl">Tracks ({p.tracks.length})</h2>
      {p.tracks.length === 0 ? <Empty title="No tracks yet" /> : (
        <div className="mb-4 space-y-2">
          {p.tracks.map((e, i) => (
            <div key={e.id} className={`${card} flex items-center justify-between gap-3 px-5 py-3`}>
              <span><span className="text-[#9A9585]">{i + 1}.</span> {e.track.title} <span className="text-xs text-[#9A9585]">· {e.track.artist.name}{e.track.isPublished ? "" : " · unpublished, hidden from listeners"}</span></span>
              <span className="flex gap-2">
                <form action={moveTrack}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="dir" value="up" /><button className={btnGhost} disabled={i === 0} aria-label="Move up">↑</button></form>
                <form action={moveTrack}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="dir" value="down" /><button className={btnGhost} disabled={i === p.tracks.length - 1} aria-label="Move down">↓</button></form>
                <form action={removeTrack}><input type="hidden" name="id" value={e.id} /><button className={btnGhost}>Remove</button></form>
              </span>
            </div>
          ))}
        </div>
      )}

      <form action={addTrack} className={`${card} mb-8 grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end`}>
        <input type="hidden" name="playlistId" value={p.id} />
        <div><label className={label} htmlFor="trackId">Add a published track</label>
          <select id="trackId" name="trackId" className={input} defaultValue="">
            <option value="" disabled>{available.length ? "Choose a track" : "All published tracks are already in this playlist"}</option>
            {available.map((t) => <option key={t.id} value={t.id}>{t.title}, {t.artist.name}</option>)}
          </select></div>
        <button className={btn} disabled={!available.length}>Add</button>
      </form>

      <form action={deletePlaylist}><input type="hidden" name="id" value={p.id} /><button className={btnDanger}>Delete this playlist</button></form>
    </>
  );
}
