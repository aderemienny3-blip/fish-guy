import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { koboToInput } from "@/lib/admin/format";
import { Banner, Empty, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { PLACEMENTS, PLACEMENT_INFO } from "@/lib/ads/labels";
import { createPackage, togglePackage, updatePackage } from "../actions";

export const dynamic = "force-dynamic";

function Fields({ p }: { p?: { name: string; placement: string; priceKobo: number; durationDays: number; maxConcurrent: number | null; description: string | null } }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div><label className={label}>Name</label><input name="name" defaultValue={p?.name} className={input} required placeholder="e.g. Weekend popup" /></div>
      <div><label className={label}>Where it appears</label>
        <select name="placement" defaultValue={p?.placement ?? "POPUP"} className={input}>{PLACEMENTS.map((k) => <option key={k} value={k}>{PLACEMENT_INFO[k].label}</option>)}</select></div>
      <div><label className={label}>Price (₦5,000 to ₦2,000,000)</label><input name="price" defaultValue={p ? koboToInput(p.priceKobo) : ""} className={input} required inputMode="decimal" /></div>
      <div><label className={label}>Runs for (days)</label><input name="durationDays" type="number" min={1} defaultValue={p?.durationDays ?? 7} className={input} required /></div>
      <div><label className={label}>Max ads at the same time</label><input name="maxConcurrent" type="number" min={1} defaultValue={p?.maxConcurrent ?? ""} className={input} placeholder="no limit" /></div>
      <div className="sm:col-span-2"><label className={label}>Description (shown to artists, optional)</label><input name="description" defaultValue={p?.description ?? ""} className={input} /></div>
    </div>
  );
}

export default async function Packages({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const list = await db.adPackage.findMany({ orderBy: [{ placement: "asc" }, { priceKobo: "asc" }] });
  return (
    <>
      <PageHeader title="Ad packages" subtitle="What artists can buy. You set the prices. Changing a price only affects new bookings." actions={<Link href="/admin/ads" className={btnGhost}>Back to ads</Link>} />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}

      <form action={createPackage} className={`${card} mb-6 space-y-4 p-5`}>
        <h2 className="font-serif text-xl">Add a package</h2>
        <Fields />
        <button className={btn}>Add package</button>
      </form>

      {list.length === 0 ? <Empty title="No packages yet" hint="Artists see the booking page as 'coming soon' until you add at least one." /> : (
        <div className="space-y-3">
          {list.map((p) => (
            <details key={p.id} className={`${card} p-5`}>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3">
                <span><span className={p.active ? "" : "text-[#9A9585] line-through"}>{p.name}</span> <span className="text-xs text-[#9A9585]">· {PLACEMENT_INFO[p.placement].label} · {p.durationDays} days · ₦{koboToInput(p.priceKobo)}</span></span>
                <span className="text-xs text-[#9A9585]">{p.active ? "On sale" : "Hidden"}</span>
              </summary>
              <form action={updatePackage} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={p.id} />
                <Fields p={p} />
                <button className={btn}>Save changes</button>
              </form>
              <form action={togglePackage} className="mt-3"><input type="hidden" name="id" value={p.id} /><button className={btnGhost}>{p.active ? "Hide from sale" : "Put on sale"}</button></form>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
