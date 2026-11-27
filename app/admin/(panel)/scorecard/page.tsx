import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { PAID_STATUSES } from "@/lib/admin/orders";
import { addDays, lagosNow } from "@/lib/delivery";
import { sourceKey } from "@/lib/attribution";
import { adMath } from "@/lib/margins";
import { formatNaira } from "@/lib/money";
import { Banner, Empty, PageHeader, btn, btnGhost, card, input, label, td, th } from "@/components/admin/ui";
import { addSpend, deleteSpend } from "./actions";

export const dynamic = "force-dynamic";
const RANGES = [7, 30, 90];

export default async function Scorecard({ searchParams }: { searchParams: Promise<{ days?: string; saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const days = RANGES.includes(Number(q.days)) ? Number(q.days) : 30;
  const today = lagosNow().date;
  const since = addDays(today, -days);
  const [orders, spend, recent] = await Promise.all([
    db.order.findMany({ where: { status: { in: PAID_STATUSES }, createdAt: { gte: new Date(Date.now() - days * 86_400_000) } }, select: { utmSource: true, refCode: true, totalKobo: true }, take: 5000 }),
    db.adSpend.groupBy({ by: ["source"], where: { day: { gte: since } }, _sum: { amountKobo: true } }),
    db.adSpend.findMany({ orderBy: [{ day: "desc" }, { createdAt: "desc" }], take: 15 }),
  ]);

  const by = new Map<string, { orders: number; sales: number; spend: number }>();
  const get = (k: string) => { let r = by.get(k); if (!r) { r = { orders: 0, sales: 0, spend: 0 }; by.set(k, r); } return r; };
  for (const o of orders) { const r = get(sourceKey(o.utmSource, o.refCode).toLowerCase()); r.orders++; r.sales += o.totalKobo; }
  for (const s of spend) get(s.source).spend += s._sum.amountKobo ?? 0;
  const rows = [...by.entries()].sort((a, b) => b[1].spend - a[1].spend || b[1].sales - a[1].sales);

  return (
    <>
      <PageHeader title="Ad scorecard" subtitle="What you spent on each source, and what it brought in." actions={<>{RANGES.map((d) => <Link key={d} href={`/admin/scorecard?days=${d}`} className={btnGhost}>{d} days{d === days ? " ✓" : ""}</Link>)}</>} />
      {q.saved && <Banner kind="ok">Saved.</Banner>}
      {q.error && <Banner>{q.error}</Banner>}

      {rows.length === 0 ? <Empty title="No sales or spend in this period" hint="Add what you spent below. Sales are matched by the utm_source on your ad links." /> : (
        <div className={`${card} mb-6 overflow-x-auto`}>
          <table className="w-full min-w-[640px]">
            <thead className="border-b border-white/10"><tr><th className={th}>Source</th><th className={th}>Spent</th><th className={th}>Paid orders</th><th className={th}>Sales</th><th className={th}>Cost per order</th><th className={th}>Sales per ₦1 spent</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {rows.map(([k, r]) => {
                const m = adMath(r.spend, r.orders, r.sales);
                return (
                  <tr key={k}>
                    <td className={td}>{k}</td>
                    <td className={td}>{r.spend ? formatNaira(r.spend) : "-"}</td>
                    <td className={td}>{r.orders}</td>
                    <td className={td}>{formatNaira(r.sales)}</td>
                    <td className={td}>{m.cpaKobo === null ? "-" : formatNaira(m.cpaKobo)}</td>
                    <td className={`${td} ${m.roas !== null && m.roas < 1 ? "text-orange-300" : ""}`}>{m.roas === null ? "-" : `₦${m.roas}`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className={`${card} mb-6 p-5`}>
        <h2 className="mb-3 font-serif text-xl">Add what you spent</h2>
        <form action={addSpend} className="flex flex-wrap items-end gap-3">
          <div><span className={label}>Day</span><input name="day" type="date" defaultValue={today} className={`${input} w-40`} /></div>
          <div><span className={label}>Source</span><input name="source" placeholder="facebook" className={`${input} w-40`} /></div>
          <div><span className={label}>Amount (₦)</span><input name="amount" inputMode="decimal" placeholder="5000" className={`${input} w-32`} /></div>
          <div className="min-w-[10rem] flex-1"><span className={label}>Note (optional)</span><input name="note" maxLength={120} className={input} /></div>
          <button type="submit" className={btn}>Add</button>
        </form>
        <p className="mt-3 text-xs text-[#9A9585]">Use the same name as the utm_source in your ad link, for example facebook or instagram, or link:CODE for a tracked link. Copy the amount from your ad account. Nothing here is filled in for you.</p>
      </section>

      {recent.length > 0 && (
        <section className={`${card} divide-y divide-white/5`}>
          <p className="px-5 py-3 text-sm font-medium">Recent entries</p>
          {recent.map((s) => (
            <form key={s.id} action={deleteSpend} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2 text-sm">
              <input type="hidden" name="id" value={s.id} />
              <span>{s.day} · {s.source} · {formatNaira(s.amountKobo)}{s.note ? ` · ${s.note}` : ""}</span>
              <button type="submit" className="text-xs text-[#9A9585] underline hover:text-red-300">Delete</button>
            </form>
          ))}
        </section>
      )}
      <p className="mt-4 max-w-3xl text-sm text-[#9A9585]">Sales per ₦1 spent under 1 (highlighted) means that source brought in less than it cost, before the cost of the food. Orders are counted by when they were placed.</p>
    </>
  );
}
