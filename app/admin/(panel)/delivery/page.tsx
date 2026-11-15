import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { fmt12, koboToInput, minutesToHHMM } from "@/lib/admin/format";
import { Banner, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { saveSlot, saveZone } from "./actions";

export default async function DeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const [settings, zones, slots] = await Promise.all([
    getSettings(),
    db.deliveryZone.findMany({ orderBy: { name: "asc" } }),
    db.deliverySlot.findMany({ orderBy: { startMinute: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Delivery"
        subtitle={`Open daily ${fmt12(settings.openMinute)} to ${fmt12(settings.closeMinute)}. Slots must fall inside these hours.`}
      />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}

      <section className={`${card} mb-8 p-5`}>
        <h2 className="font-serif text-xl">Delivery areas and fees</h2>
        <p className="mb-4 mt-1 text-sm text-[#9A9585]">
          Customers pick an area at checkout. Leave &quot;Free over&quot; empty if you never waive the fee. Areas can be
          switched off but not deleted, so old orders keep their history.
        </p>
        <div className="space-y-3">
          {zones.length === 0 && <p className="text-sm text-[#9A9585]">No areas yet. Add your first one below.</p>}
          {zones.map((z) => (
            <form key={z.id} action={saveZone} className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_9rem_auto_auto]">
              <input type="hidden" name="id" value={z.id} />
              <div><label className={label}>Area</label><input name="name" defaultValue={z.name} className={input} /></div>
              <div><label className={label}>Fee (₦)</label><input name="fee" defaultValue={koboToInput(z.feeKobo)} className={input} /></div>
              <div><label className={label}>Free over (₦)</label><input name="freeOver" defaultValue={z.freeOverKobo !== null ? koboToInput(z.freeOverKobo) : ""} className={input} /></div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={z.active} className="h-4 w-4 accent-[#D4AF37]" /> On
              </label>
              <button type="submit" className={btnGhost}>Save</button>
            </form>
          ))}
        </div>

        <form action={saveZone} className="mt-6 grid items-end gap-3 border-t border-white/10 pt-5 sm:grid-cols-[1fr_8rem_9rem_auto_auto]">
          <div><label className={label}>New area</label><input name="name" placeholder="e.g. Lekki Phase 1" className={input} /></div>
          <div><label className={label}>Fee (₦)</label><input name="fee" className={input} /></div>
          <div><label className={label}>Free over (₦)</label><input name="freeOver" placeholder="optional" className={input} /></div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4 accent-[#D4AF37]" /> On
          </label>
          <button type="submit" className={btn}>Add area</button>
        </form>
      </section>

      <section className={`${card} p-5`}>
        <h2 className="font-serif text-xl">Delivery time slots</h2>
        <p className="mb-4 mt-1 text-sm text-[#9A9585]">
          &quot;Orders per slot&quot; is how many deliveries you can handle in that window each day. When it&apos;s full,
          customers can&apos;t book it.
        </p>
        <div className="space-y-3">
          {slots.length === 0 && <p className="text-sm text-[#9A9585]">No time slots yet. Add your first one below.</p>}
          {slots.map((s) => (
            <form key={s.id} action={saveSlot} className="grid items-end gap-3 sm:grid-cols-[1fr_7rem_7rem_7rem_auto_auto]">
              <input type="hidden" name="id" value={s.id} />
              <div><label className={label}>Label</label><input name="label" defaultValue={s.label} className={input} /></div>
              <div><label className={label}>From</label><input type="time" name="start" defaultValue={minutesToHHMM(s.startMinute)} className={input} /></div>
              <div><label className={label}>To</label><input type="time" name="end" defaultValue={minutesToHHMM(s.endMinute)} className={input} /></div>
              <div><label className={label}>Orders per slot</label><input name="maxOrders" type="number" min={1} defaultValue={s.maxOrders} className={input} /></div>
              <label className="flex items-center gap-2 pb-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={s.active} className="h-4 w-4 accent-[#D4AF37]" /> On
              </label>
              <button type="submit" className={btnGhost}>Save</button>
            </form>
          ))}
        </div>

        <form action={saveSlot} className="mt-6 grid items-end gap-3 border-t border-white/10 pt-5 sm:grid-cols-[1fr_7rem_7rem_7rem_auto_auto]">
          <div><label className={label}>New slot label</label><input name="label" placeholder="Leave blank to auto-name" className={input} /></div>
          <div><label className={label}>From</label><input type="time" name="start" className={input} /></div>
          <div><label className={label}>To</label><input type="time" name="end" className={input} /></div>
          <div><label className={label}>Orders per slot</label><input name="maxOrders" type="number" min={1} className={input} /></div>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4 accent-[#D4AF37]" /> On
          </label>
          <button type="submit" className={btn}>Add slot</button>
        </form>
      </section>
    </>
  );
}
