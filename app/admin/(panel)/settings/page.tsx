import { OWNER_ONLY, requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { koboToInput, minutesToHHMM } from "@/lib/admin/format";
import { Banner, PageHeader, btn, card, input, label } from "@/components/admin/ui";
import { saveSettings } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireAdmin(OWNER_ONLY);
  const { saved, error } = await searchParams;
  const s = await getSettings();

  return (
    <>
      <PageHeader title="Settings" subtitle="Opening hours, stock alerts and how customers are grouped." />
      {saved && <Banner kind="ok">Settings saved.</Banner>}
      {error && <Banner>{error}</Banner>}

      <form action={saveSettings} className="max-w-3xl space-y-6">
        <section className={`${card} p-5`}>
          <h2 className="font-serif text-xl">Opening hours</h2>
          <p className="mb-4 mt-1 text-sm text-[#9A9585]">Every day, Lagos time. Delivery slots must fit inside these hours.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="open">Opens</label><input id="open" type="time" name="open" defaultValue={minutesToHHMM(s.openMinute)} className={input} /></div>
            <div><label className={label} htmlFor="close">Closes</label><input id="close" type="time" name="close" defaultValue={minutesToHHMM(s.closeMinute)} className={input} /></div>
          </div>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-serif text-xl">Stock alerts</h2>
          <div className="mt-3 max-w-xs">
            <label className={label} htmlFor="lowStock">Warn me when stock is at or below</label>
            <input id="lowStock" name="lowStock" type="number" min={0} defaultValue={s.lowStockThreshold} className={input} />
          </div>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-serif text-xl">Customer groups</h2>
          <p className="mb-4 mt-1 text-sm text-[#9A9585]">
            These rules decide who counts as a Super Buyer, Loyal, New, At risk or Lost on the Customers page.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={label} htmlFor="superOrders">Super Buyer: orders</label><input id="superOrders" name="superOrders" type="number" min={1} defaultValue={s.superBuyerMinOrders} className={input} /></div>
            <div><label className={label} htmlFor="superDays">...within (days)</label><input id="superDays" name="superDays" type="number" min={1} defaultValue={s.superBuyerWindowDays} className={input} /></div>
            <div><label className={label} htmlFor="minSpend">Or total spend (₦)</label><input id="minSpend" name="minSpend" defaultValue={s.superBuyerMinSpendKobo ? koboToInput(s.superBuyerMinSpendKobo) : ""} placeholder="optional" className={input} /></div>
            <div><label className={label} htmlFor="loyalOrders">Loyal: orders</label><input id="loyalOrders" name="loyalOrders" type="number" min={1} defaultValue={s.loyalMinOrders} className={input} /></div>
            <div><label className={label} htmlFor="newDays">New: first order within (days)</label><input id="newDays" name="newDays" type="number" min={1} defaultValue={s.newCustomerDays} className={input} /></div>
            <div />
            <div><label className={label} htmlFor="atRiskDays">At risk: no order for (days)</label><input id="atRiskDays" name="atRiskDays" type="number" min={1} defaultValue={s.atRiskDays} className={input} /></div>
            <div><label className={label} htmlFor="lostDays">Lost: no order for (days)</label><input id="lostDays" name="lostDays" type="number" min={1} defaultValue={s.lostDays} className={input} /></div>
          </div>
        </section>

        <button type="submit" className={btn}>Save settings</button>
      </form>
    </>
  );
}
