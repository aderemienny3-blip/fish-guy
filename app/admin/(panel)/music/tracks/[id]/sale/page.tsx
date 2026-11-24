import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { Banner, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { editionTaken, toLagosInput } from "@/lib/music/sales";
import { saveSale } from "./actions";
import { saveMetadata } from "./metadata-actions";

export const dynamic = "force-dynamic";

export default async function SaleSettings({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { id } = await params;
  const { saved, error } = await searchParams;
  const t = await db.track.findUnique({ where: { id }, include: { artist: { select: { name: true } } } });
  if (!t) notFound();
  const taken = t.editionLimit ? await editionTaken(db, id) : 0;

  return (
    <>
      <PageHeader title={`Sale settings: ${t.title}`} subtitle={`${t.artist.name}. Set how this track is sold.`} actions={<Link href="/admin/music" className={btnGhost}>Back to music</Link>} />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}
      <form action={saveSale} className={`${card} max-w-2xl space-y-5 p-6`}>
        <input type="hidden" name="id" value={t.id} />
        <div className="space-y-2 rounded-lg border border-[#D4AF37]/40 p-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="superfanOnly" defaultChecked={t.isSuperfanOnly} className="h-4 w-4 accent-[#D4AF37]" /> Superfan exclusive: not for sale</label>
          <p className="text-xs text-[#9A9585]">Only fans who have bought 3 different tracks by this artist can play the full track. Everything below about price is ignored while this is ticked.</p>
        </div>
        <div>
          <label className={label}>Price in naira (the minimum, if fans can pay what they want)</label>
          <input name="price" defaultValue={t.priceKobo / 100} inputMode="decimal" className={input} />
        </div>
        <div className="space-y-3 rounded-lg border border-white/10 p-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="payWhatYouWant" defaultChecked={t.payWhatYouWant} className="h-4 w-4 accent-[#D4AF37]" /> Pay what you want: fans can pay more than the price</label>
          <div><label className={label}>Suggested amount (optional)</label><input name="suggested" defaultValue={t.suggestedKobo ? t.suggestedKobo / 100 : ""} inputMode="decimal" className={input} /></div>
        </div>
        <div className="space-y-3 rounded-lg border border-white/10 p-4">
          <div>
            <label className={label}>Release date and time, Lagos time (blank = on sale now)</label>
            <input name="releaseAt" type="datetime-local" defaultValue={toLagosInput(t.releaseAt)} className={input} />
          </div>
          <p className="text-xs text-[#9A9585]">Before this moment fans can pre-order and hear the 30-second preview. The full track and downloads unlock automatically at this time. Publish the track to show it on the site.</p>
        </div>
        <div className="space-y-3 rounded-lg border border-white/10 p-4">
          <div>
            <label className={label}>Limited edition: number of copies (blank = unlimited)</label>
            <input name="editionLimit" defaultValue={t.editionLimit ?? ""} inputMode="numeric" className={input} />
          </div>
          <p className="text-xs text-[#9A9585]">{t.editionLimit ? `${taken} of ${t.editionLimit} copies sold or being bought now. ` : ""}Each buyer gets a number, like No. 14 of 100. Unpaid checkouts hold a copy for 60 minutes.</p>
        </div>
        <button className={btn}>Save sale settings</button>
      </form>

      <form action={saveMetadata} className={`${card} mt-6 max-w-2xl space-y-4 p-6`}>
        <input type="hidden" name="id" value={t.id} />
        <h2 className="text-lg font-medium">File labels</h2>
        <p className="text-sm text-[#9A9585]">These are written into every MP3 a fan downloads, so the song shows its title, artist, cover and copyright in any music app. The ISRC is the recording&apos;s international ID, issued by an ISRC agency or the artist&apos;s distributor. Leave it blank if the artist does not have one yet.</p>
        <div><label className={label}>ISRC (12 characters, like NGABC2400001)</label><input name="isrc" defaultValue={t.isrc ?? ""} maxLength={20} className={input} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className={label}>Copyright owner (blank = the artist)</label><input name="copyrightOwner" defaultValue={t.copyrightOwner ?? ""} maxLength={120} className={input} /></div>
          <div><label className={label}>Copyright year</label><input name="copyrightYear" defaultValue={t.copyrightYear ?? new Date().getFullYear()} inputMode="numeric" className={input} /></div>
        </div>
        <button className={btn}>Save file labels</button>
      </form>
    </>
  );
}
