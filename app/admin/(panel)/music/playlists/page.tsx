import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { Banner, Empty, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { createPlaylist } from "./actions";

export const dynamic = "force-dynamic";

export default async function Playlists({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const lists = await db.playlist.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: { select: { tracks: true } } } });
  return (
    <>
      <PageHeader title="Playlists" subtitle="Compiled by you, track by track. No AI." actions={<Link href="/admin/music" className={btnGhost}>Back to Sounds</Link>} />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}
      <form action={createPlaylist} className={`${card} mb-6 grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end`}>
        <div><label className={label} htmlFor="title">New playlist name</label><input id="title" name="title" className={input} required minLength={2} maxLength={80} placeholder="e.g. Weekend cooking vibes" /></div>
        <button className={btn}>Create</button>
      </form>
      {lists.length === 0 ? <Empty title="No playlists yet" hint="Create one, then add published tracks to it." /> : (
        <div className="space-y-2">
          {lists.map((p) => (
            <Link key={p.id} href={`/admin/music/playlists/${p.id}`} className={`${card} flex items-center justify-between gap-3 px-5 py-3`}>
              <span>{p.title} <span className="text-xs text-[#9A9585]">· {p._count.tracks} track{p._count.tracks === 1 ? "" : "s"}</span></span>
              <span className="text-xs text-[#D4AF37]">{p.isShopPlaylist ? "Plays in the shop · " : ""}{p.isPublished ? "Published" : "Draft"}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
