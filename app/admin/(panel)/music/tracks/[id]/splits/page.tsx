import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { Banner, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { BPS, bpsToPercent } from "@/lib/music/split-math";
import { addSplit, removeSplit } from "./actions";

export const dynamic = "force-dynamic";

export default async function Splits({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { id } = await params;
  const { saved, error } = await searchParams;
  const t = await db.track.findUnique({ where: { id }, include: { artist: { select: { name: true } }, splits: { include: { artist: { select: { name: true } } }, orderBy: { createdAt: "asc" } } } });
  if (!t) notFound();
  const others = await db.artist.findMany({ where: { id: { not: t.artistId } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  const used = t.splits.reduce((n, s) => n + s.bps, 0);

  return (
    <>
      <PageHeader title={`Split sheet: ${t.title}`} subtitle={`${t.artist.name} is the main artist. Collaborators get a percentage of the artist share, and the main artist keeps the rest.`}
        actions={<><Link href={`/admin/music/tracks/${t.id}/sale`} className={btnGhost}>Sale settings</Link> <Link href="/admin/music" className={btnGhost}>Back to music</Link></>} />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}

      <div className={`${card} mb-6 max-w-2xl space-y-2 p-6`}>
        <p className="text-sm"><b>{t.artist.name}</b> (main artist): {bpsToPercent(BPS - used)}</p>
        {t.splits.map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
            <span>{s.artist.name} <span className="text-xs text-[#9A9585]">· {s.role}</span>: {bpsToPercent(s.bps)}</span>
            <form action={removeSplit}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="trackId" value={t.id} /><button className={btnGhost}>Remove</button></form>
          </div>
        ))}
      </div>

      <form action={addSplit} className={`${card} max-w-2xl space-y-4 p-6`}>
        <input type="hidden" name="trackId" value={t.id} />
        <h2 className="text-lg font-medium">Add a collaborator</h2>
        <p className="text-sm text-[#9A9585]">The person needs an artist profile on Fish Guy Sounds so they can see their earnings and ask for payouts. Changes only affect sales made after you save. Everyone on the sheet should agree to it in writing.</p>
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className={label}>Artist</label><select name="artistId" className={input} required>{others.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div><label className={label}>Their % of the artist share</label><input name="percent" inputMode="decimal" className={input} required /></div>
          <div><label className={label}>Role</label><input name="role" placeholder="Producer, Featured…" maxLength={40} className={input} /></div>
        </div>
        <button className={btn}>Add to split sheet</button>
      </form>
    </>
  );
}
