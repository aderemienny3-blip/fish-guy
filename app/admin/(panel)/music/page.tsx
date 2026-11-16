import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { formatNaira } from "@/lib/money";
import { Banner, Empty, PageHeader, Stat, btn, btnGhost, card, input, td, th } from "@/components/admin/ui";
import { setPrice, togglePublish } from "./actions";

export const dynamic = "force-dynamic";

export default async function MusicAdmin({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const since = new Date(Date.now() - 30 * 86_400_000);

  const [tracks, artists, pending, plays, revenue, sales] = await Promise.all([
    db.track.findMany({ include: { artist: true, _count: { select: { plays: true, orderItems: true } } }, orderBy: { createdAt: "desc" } }),
    db.artist.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { tracks: true } } } }),
    db.artistApplication.count({ where: { status: "PENDING" } }),
    db.musicPlay.count({ where: { playedAt: { gte: since } } }),
    db.musicOrder.aggregate({ where: { status: "PAID" }, _sum: { amountKobo: true } }),
    db.musicOrder.count({ where: { status: "PAID" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Fish Guy Sounds"
        subtitle="Artists, tracks and music sales. Music payments go through the same Monnify account."
        actions={
          <>
            <Link href="/admin/music/applications" className={btnGhost}>
              Applications{pending ? ` (${pending})` : ""}
            </Link>
            <Link href="/admin/music/artists/new" className={btnGhost}>Add artist</Link>
            <Link href="/admin/music/tracks/new" className={btn}>Upload track</Link>
          </>
        }
      />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Music revenue" value={formatNaira(revenue._sum.amountKobo ?? 0)} hint={`${sales} paid orders`} />
        <Stat label="Plays, 30 days" value={plays.toLocaleString()} />
        <Stat label="Tracks live" value={tracks.filter((t) => t.isPublished).length} hint={`${tracks.length} total`} />
        <Stat label="Pending applications" value={pending} />
      </div>

      <h2 className="mb-3 font-serif text-xl">Tracks</h2>
      {tracks.length === 0 ? (
        <Empty
          title="No tracks yet"
          hint={artists.length ? "Upload the first release." : "Approve an artist application or add an artist, then upload their first track."}
          action={<Link href={artists.length ? "/admin/music/tracks/new" : "/admin/music/artists/new"} className={btn}>{artists.length ? "Upload track" : "Add artist"}</Link>}
        />
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-white/10">
              <tr><th className={th}>Track</th><th className={th}>Price</th><th className={th}>Plays</th><th className={th}>Sales</th><th className={th}>Status</th><th className={th}></th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tracks.map((t) => (
                <tr key={t.id} className={t.isPublished ? "" : "opacity-70"}>
                  <td className={td}>
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-[#9A9585]">{t.artist.name} · {t.genre}{t.isFreeToStream ? " · free stream" : ""}</p>
                  </td>
                  <td className={td}>
                    <form action={setPrice} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={t.id} />
                      <input name="price" defaultValue={t.priceKobo / 100} className={`${input} w-24`} inputMode="decimal" />
                      <button className={btnGhost}>Set</button>
                    </form>
                  </td>
                  <td className={td}>{t._count.plays}</td>
                  <td className={td}>{t._count.orderItems}</td>
                  <td className={td}>{t.isPublished ? "Live" : "Draft"}</td>
                  <td className={`${td} text-right`}>
                    <form action={togglePublish}>
                      <input type="hidden" name="id" value={t.id} />
                      <button className="text-xs text-[#9A9585] underline hover:text-[#D4AF37]">{t.isPublished ? "Unpublish" : "Publish"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 mt-8 font-serif text-xl">Artists</h2>
      {artists.length === 0 ? (
        <Empty title="No artists yet" hint="Artists appear here when you approve an application or add one yourself." />
      ) : (
        <div className={`${card} divide-y divide-white/5`}>
          {artists.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <Link href={`/admin/music/artists/${a.id}`} className="font-medium hover:text-[#D4AF37]">{a.name}</Link>
                <p className="text-xs text-[#9A9585]">{a._count.tracks} tracks{a.isFeatured ? " · Artist of the week" : ""}</p>
              </div>
              <Link href={`/artists/${a.slug}`} className="text-xs text-[#9A9585] underline hover:text-[#D4AF37]">View page</Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
