import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { Banner, Empty, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { formatNaira } from "@/lib/money";
import { linkResults } from "@/lib/link-stats";
import { siteUrl } from "@/lib/seo";
import { createLink, toggleLink } from "./actions";

export const dynamic = "force-dynamic";
const KIND: Record<string, string> = { ARTIST: "Artist", REFERRAL: "Referral", CAMPUS: "Campus", AD: "Ad", OTHER: "Other" };

export default async function Links({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const links = await db.trackedLink.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const results = await Promise.all(links.map((l) => linkResults(l.code)));

  return (
    <>
      <PageHeader title="Tracked links and codes" subtitle="One short link per artist, campus rep, referrer or ad. Each shows clicks, visitors and orders. Artists get their own link automatically." />
      {q.saved && <Banner kind="ok">Link created.</Banner>}
      {q.error && <Banner>{q.error}</Banner>}
      <form action={createLink} className={`${card} mb-8 grid max-w-3xl gap-4 p-6 md:grid-cols-2`}>
        <div><label className={label}>Code (the end of the link)</label><input name="code" className={input} required placeholder="unilag-rep" /></div>
        <div><label className={label}>Label</label><input name="label" className={input} required placeholder="UNILAG campus rep, Tola" /></div>
        <div><label className={label}>What is it for</label><select name="kind" className={input}>{Object.entries(KIND).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></div>
        <div><label className={label}>Where it sends people</label><input name="destination" defaultValue="/shop" className={input} /></div>
        <div className="md:col-span-2"><button className={btn}>Create link</button></div>
      </form>
      {links.length === 0 ? <Empty title="No links yet" hint="Create one above. Artist links appear after an artist opens their dashboard." /> : (
        <div className="space-y-3">
          {links.map((l, i) => {
            const r = results[i];
            return (
              <div key={l.id} className={`${card} p-4 text-sm`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2"><strong>{l.label}</strong><span className="text-[#9A9585]">{KIND[l.kind] ?? l.kind}{l.active ? "" : " · off"}</span></div>
                <p className="mt-1 break-all text-[#D4AF37]">{siteUrl()}/go/{l.code}</p>
                <p className="mt-2 text-[#9A9585]">{r.clicks} click{r.clicks === 1 ? "" : "s"} · {r.visitors} visitor{r.visitors === 1 ? "" : "s"} · {r.shopOrders} food order{r.shopOrders === 1 ? "" : "s"} ({formatNaira(r.shopKobo)}) · {r.musicOrders} track sale{r.musicOrders === 1 ? "" : "s"} ({formatNaira(r.musicKobo)})</p>
                <form action={toggleLink} className="mt-3"><input type="hidden" name="id" value={l.id} /><button className={btnGhost}>{l.active ? "Turn off" : "Turn on"}</button></form>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
