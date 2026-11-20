import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { formatNaira } from "@/lib/money";
import { lagosNow } from "@/lib/delivery";
import { giftsClaimed, isLive } from "@/lib/festive";
import { Banner, PageHeader, Stat, btn, btnGhost, card, input, label } from "@/components/admin/ui";
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
  const v = row ?? { active: false, title: "Festive Carton Deals", startDate: "2026-12-15", endDate: "2027-01-09", giftMinCartons: 2, giftName: "", giftQty: 0, bigMinCartons: 5, rewardType: "NONE", rewardValue: 0, stackWithStudent: false };

  return (
    <>
      <PageHeader title="Festive carton deals" subtitle="A gift at a few cartons, a bigger reward at more. Shown as a pop-up, a top strip, a /festive page and a nudge in the cart." actions={<Link href="/festive" className={btnGhost}>View page</Link>} />
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

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="stackWithStudent" defaultChecked={v.stackWithStudent} className="h-4 w-4 accent-[#D4AF37]" />
          Allow this to stack with the student discount (off = customer gets whichever is bigger)
        </label>

        <button className={btn}>Save</button>
      </form>
    </>
  );
}
