import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { formatNaira } from "@/lib/money";
import { lagosNow } from "@/lib/delivery";
import { giftsClaimed, isLive } from "@/lib/festive";
import { Banner, PageHeader, Stat, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import ProductPhotoField from "@/components/admin/ProductPhotoField";
import { saveFestive } from "./actions";

export const dynamic = "force-dynamic";

const PAID = ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

export default async function FestiveAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const [row, claimed, cartonProducts, pickup, used] = await Promise.all([
    db.festivePromo.findUnique({ where: { id: 1 } }),
    giftsClaimed(),
    db.product.count({ where: { active: true, unit: "kg", cartonKg: { not: null } } }),
    db.deliveryZone.findFirst({ where: { isPickup: true, active: true } }),
    db.order.aggregate({ where: { status: { in: [...PAID] }, OR: [{ giftName: { not: null } }, { promoDiscountKobo: { gt: 0 } }] }, _count: true, _sum: { promoDiscountKobo: true } }),
  ]);
  const today = lagosNow().date;
  const status = !row ? "Not set up" : !row.active ? "Off" : isLive(row, today) ? "Live now" : today < row.startDate ? "Scheduled" : "Ended";
  const v = row ?? { active: false, title: "Festive Carton Deals", startDate: "2026-12-15", endDate: "2027-01-09", giftMinCartons: 2, giftName: "", giftQty: 0, bigMinCartons: 5, rewardType: "NONE", rewardValue: 0, stackWithStudent: false, popupEnabled: true, ribbonEnabled: true, ribbonText: "", popupImage: "", popupHeadline: "", popupMessage: "", popupButton: "", popupLink: "/festive", popupDelay: 2, popupFrequency: "VISIT", popupShowOffers: true };

  return (
    <>
      <PageHeader title="Festive carton deals" subtitle="A gift at a few cartons, a bigger reward at more. Shown as a pop-up, a top strip, a /festive page and a nudge in the cart." actions={<><Link href="/?festivePreview=1" target="_blank" className={btnGhost}>Preview pop-up</Link> <Link href="/festive" className={btnGhost}>View page</Link></>} />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Status" value={status} />
        <Stat label="Gifts left" value={row?.giftName ? Math.max(0, row.giftQty - claimed) : 0} hint={row?.giftName ? `${claimed} promised of ${row.giftQty}` : "No gift set"} />
        <Stat label="Deal orders (paid)" value={used._count} />
        <Stat label="Discount given" value={formatNaira(used._sum.promoDiscountKobo ?? 0)} />
      </div>

      {cartonProducts === 0 && <Banner>No product has a carton size yet. Open a product in Admin → Products, fill in “Carton size (kg)” (for example 10 for chicken, 20 for fish) and save. The deal only counts products with a carton size.</Banner>}
      {!pickup && <Banner>Store pickup is not set up. Run <code>node scripts/setup-festive.mjs</code> once to add it.</Banner>}

      <form action={saveFestive} className={`${card} max-w-2xl space-y-5 p-5`}>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="active" defaultChecked={v.active} className="h-4 w-4 accent-[#D4AF37]" />
          Deal is on (it only shows between the dates below)
        </label>
        <div>
          <label className={label} htmlFor="title">Title</label>
          <input id="title" name="title" defaultValue={v.title} maxLength={50} className={input} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label} htmlFor="startDate">Starts</label><input id="startDate" name="startDate" type="date" defaultValue={v.startDate} className={input} required /></div>
          <div><label className={label} htmlFor="endDate">Ends (last day included)</label><input id="endDate" name="endDate" type="date" defaultValue={v.endDate} className={input} required /></div>
        </div>

        <fieldset className="space-y-3 rounded-lg border border-white/10 p-4">
          <legend className="px-1 text-sm font-medium text-[#D4AF37]">Free gift</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={label} htmlFor="giftMinCartons">At this many cartons</label><input id="giftMinCartons" name="giftMinCartons" type="number" min={1} defaultValue={v.giftMinCartons} className={input} /></div>
            <div className="sm:col-span-2"><label className={label} htmlFor="giftName">Gift (leave empty for no gift)</label><input id="giftName" name="giftName" defaultValue={v.giftName ?? ""} maxLength={60} placeholder="Kitchen plates set" className={input} /></div>
          </div>
          <div><label className={label} htmlFor="giftQty">How many gifts do you have?</label><input id="giftQty" name="giftQty" type="number" min={0} defaultValue={v.giftQty} className={`${input} max-w-[10rem]`} /></div>
          <p className="text-xs text-[#9A9585]">When the gifts run out, the gift is no longer promised to new customers. One gift per order. Pack the gift yourself: it shows on the order page.</p>
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-white/10 p-4">
          <legend className="px-1 text-sm font-medium text-[#D4AF37]">Bigger reward</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={label} htmlFor="bigMinCartons">At this many cartons</label><input id="bigMinCartons" name="bigMinCartons" type="number" min={1} defaultValue={v.bigMinCartons} className={input} /></div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="rewardType">Reward</label>
              <select id="rewardType" name="rewardType" defaultValue={v.rewardType} className={input}>
                <option value="NONE">No bigger reward</option>
                <option value="PERCENT">Percent off the cartons</option>
                <option value="PER_CARTON">Naira off every carton</option>
                <option value="FREE_DELIVERY">Free delivery</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="percent">If percent: how many % (1 to 30)</label><input id="percent" name="percent" type="number" min={1} max={30} defaultValue={v.rewardType === "PERCENT" ? v.rewardValue : ""} className={input} /></div>
            <div><label className={label} htmlFor="perCarton">If naira per carton: ₦ off each carton</label><input id="perCarton" name="perCarton" inputMode="decimal" defaultValue={v.rewardType === "PER_CARTON" ? v.rewardValue / 100 : ""} className={input} /></div>
          </div>
          <p className="text-xs text-[#9A9585]">Work out your margin first. Percent and naira-per-carton apply only to products sold by the carton. Free delivery is the cheapest to give if prices are tight.</p>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-white/10 p-4">
          <legend className="px-1 text-sm font-medium text-[#D4AF37]">Pop-up and top strip (what customers see)</legend>
          <p className="text-xs text-[#9A9585]">Press Save, then &ldquo;Preview pop-up&rdquo; at the top to see it on the real site, even before the deal starts. Preview only works while you are signed in.</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="popupEnabled" defaultChecked={v.popupEnabled} className="h-4 w-4 accent-[#D4AF37]" /> Show the pop-up</label>
          <ProductPhotoField initial={v.popupImage ?? ""} title="Pop-up picture (landscape works best, about 1200 by 630)" name="popupImage" />
          <div><label className={label} htmlFor="popupHeadline">Headline (empty = the title above)</label><input id="popupHeadline" name="popupHeadline" defaultValue={v.popupHeadline ?? ""} maxLength={60} className={input} placeholder="Christmas carton deals are here" /></div>
          <div><label className={label} htmlFor="popupMessage">Message under the offers (optional)</label><textarea id="popupMessage" name="popupMessage" defaultValue={v.popupMessage ?? ""} maxLength={160} rows={2} className={input} placeholder="Chicken, fish and more, by the carton." /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="popupShowOffers" defaultChecked={v.popupShowOffers} className="h-4 w-4 accent-[#D4AF37]" /> Show the gift and reward lines (they are written for you from the settings above, so they are always correct)</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={label} htmlFor="popupButton">Button text</label><input id="popupButton" name="popupButton" defaultValue={v.popupButton ?? ""} maxLength={24} className={input} placeholder="See the deals" /></div>
            <div><label className={label} htmlFor="popupLink">Button goes to</label>
              <select id="popupLink" name="popupLink" defaultValue={v.popupLink} className={input}>
                <option value="/festive">The festive deal page</option>
                <option value="/shop">The shop</option>
                <option value="/">The home page</option>
              </select></div>
            <div><label className={label} htmlFor="popupDelay">Shows after (seconds)</label><input id="popupDelay" name="popupDelay" type="number" min={0} max={30} defaultValue={v.popupDelay} className={input} /></div>
            <div><label className={label} htmlFor="popupFrequency">How often</label>
              <select id="popupFrequency" name="popupFrequency" defaultValue={v.popupFrequency} className={input}>
                <option value="VISIT">Once per visit</option>
                <option value="DAY">Once a day</option>
              </select></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="ribbonEnabled" defaultChecked={v.ribbonEnabled} className="h-4 w-4 accent-[#D4AF37]" /> Show the gold strip at the top of every page</label>
          <div><label className={label} htmlFor="ribbonText">Strip text (empty = written for you from the offers)</label><input id="ribbonText" name="ribbonText" defaultValue={v.ribbonText ?? ""} maxLength={90} className={input} placeholder="Christmas carton deals" /></div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="stackWithStudent" defaultChecked={v.stackWithStudent} className="h-4 w-4 accent-[#D4AF37]" />
          Allow this to stack with the student discount (off = customer gets whichever is bigger)
        </label>

        <button className={btn}>Save</button>
      </form>
    </>
  );
}
