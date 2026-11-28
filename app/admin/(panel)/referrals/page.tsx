import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime, koboToInput } from "@/lib/admin/format";
import { getReferralSettings } from "@/lib/referrals";
import { formatNaira } from "@/lib/money";
import { Banner, PageHeader, Stat, btn, card, input, label, td, th } from "@/components/admin/ui";
import { adjustCredit, saveReferralSettings } from "./actions";

export const dynamic = "force-dynamic";
const KIND: Record<string, string> = { REFERRAL_REWARD: "Referral reward", SPENT: "Used on an order", RELEASED: "Returned", MANUAL: "Manual" };

export default async function Referrals({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const [s, codes, referred, byCustomer, recent] = await Promise.all([
    getReferralSettings(),
    db.referralCode.count(),
    db.order.count({ where: { referralCode: { not: null }, status: { in: ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] } } }),
    db.creditEntry.groupBy({ by: ["customerId"], _sum: { amountKobo: true } }),
    db.creditEntry.findMany({ orderBy: { createdAt: "desc" }, take: 40, include: { customer: { select: { name: true, phone: true, email: true } } } }),
  ]);
  const owed = byCustomer.reduce((t, r) => t + Math.max(0, r._sum.amountKobo ?? 0), 0);

  return (
    <>
      <PageHeader title="Referrals and credit" subtitle="Friends get a discount on a first order. The person who referred them earns credit after that order is delivered." />
      {q.saved && <Banner kind="ok">Saved.</Banner>}
      {q.error && <Banner>{q.error}</Banner>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Referral codes issued" value={codes} />
        <Stat label="Paid orders using a code" value={referred} />
        <Stat label="Credit customers can spend" value={formatNaira(owed)} hint="What you owe in credit right now" />
      </div>

      <section className={`${card} mb-6 max-w-3xl space-y-4 p-5`}>
        <h2 className="font-serif text-xl">Programme</h2>
        <form action={saveReferralSettings} className="space-y-4">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={s.enabled} /> Referral codes are on</label>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><span className={label}>Friend&apos;s discount (₦)</span><input name="discount" defaultValue={s.discountKobo ? koboToInput(s.discountKobo) : ""} inputMode="decimal" className={input} /></div>
            <div><span className={label}>Referrer&apos;s credit (₦)</span><input name="reward" defaultValue={s.rewardKobo ? koboToInput(s.rewardKobo) : ""} inputMode="decimal" className={input} /></div>
            <div><span className={label}>Minimum food total (₦)</span><input name="min" defaultValue={s.minOrderKobo ? koboToInput(s.minOrderKobo) : ""} inputMode="decimal" placeholder="optional" className={input} /></div>
          </div>
          <button type="submit" className={btn}>Save</button>
        </form>
        <p className="text-xs text-[#9A9585]">Pick amounts your margin can afford: the discount is paid out of that first order, and the credit is paid out of a later one. Codes work for first orders only and never for your own code. Changing the amounts affects new orders only. Check Cost and margin before choosing.</p>
      </section>

      <section className={`${card} mb-6 max-w-3xl space-y-3 p-5`}>
        <h2 className="font-serif text-xl">Add or remove credit by hand</h2>
        <form action={adjustCredit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[12rem] flex-1"><span className={label}>Customer phone or email</span><input name="who" required className={input} /></div>
          <div><span className={label}>Action</span><select name="direction" className="rounded-md border border-white/15 bg-[#0A0A0A] px-3 py-2 text-sm"><option value="add">Add credit</option><option value="remove">Remove credit</option></select></div>
          <div><span className={label}>Amount (₦)</span><input name="amount" required inputMode="decimal" className={`${input} w-28`} /></div>
          <div className="min-w-[12rem] flex-1"><span className={label}>Reason</span><input name="note" required maxLength={200} placeholder="For example: complaint on order FG-…" className={input} /></div>
          <button type="submit" className={btn}>Save</button>
        </form>
        <p className="text-xs text-[#9A9585]">Use this to settle a complaint you resolved with a credit. Every change is saved in the activity log.</p>
      </section>

      {recent.length > 0 && (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-white/10"><tr><th className={th}>When</th><th className={th}>Customer</th><th className={th}>What</th><th className={th}>Amount</th><th className={th}>Note</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {recent.map((e) => (
                <tr key={e.id}><td className={`${td} whitespace-nowrap text-xs text-[#9A9585]`}>{fmtDateTime(e.createdAt)}</td><td className={td}>{e.customer.name ?? e.customer.phone ?? e.customer.email}</td><td className={td}>{KIND[e.kind] ?? e.kind}</td><td className={td}>{e.amountKobo > 0 ? "+" : "-"}{formatNaira(Math.abs(e.amountKobo))}</td><td className={`${td} text-xs text-[#9A9585]`}>{e.note ?? ""}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
