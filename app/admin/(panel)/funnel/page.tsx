import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { PAID_STATUSES } from "@/lib/admin/orders";
import { addDays, lagosNow } from "@/lib/delivery";
import { sourceKey } from "@/lib/attribution";
import { Empty, PageHeader, btnGhost, card, td, th } from "@/components/admin/ui";
import { formatNaira } from "@/lib/money";

export const dynamic = "force-dynamic";
const RANGES = [7, 30, 90];

type Row = { visitors: number; adds: number; checkouts: number; orders: number; kobo: number };
const blank = (): Row => ({ visitors: 0, adds: 0, checkouts: 0, orders: 0, kobo: 0 });
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "-");

export default async function Funnel({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const days = RANGES.includes(Number(q.days)) ? Number(q.days) : 30;
  const since = addDays(lagosNow().date, -days);
  const [events, orders] = await Promise.all([
    db.funnelEvent.groupBy({ by: ["source", "type"], where: { day: { gte: since } }, _count: { _all: true } }),
    db.order.findMany({ where: { status: { in: PAID_STATUSES }, createdAt: { gte: new Date(Date.now() - days * 86_400_000) } }, select: { utmSource: true, refCode: true, totalKobo: true }, take: 5000 }),
  ]);
  const by = new Map<string, Row>();
  const get = (k: string) => { let r = by.get(k); if (!r) { r = blank(); by.set(k, r); } return r; };
  for (const e of events) {
    const r = get(e.source);
    if (e.type === "VISIT") r.visitors += e._count._all;
    else if (e.type === "ADD_TO_CART") r.adds += e._count._all;
    else if (e.type === "CHECKOUT_STARTED") r.checkouts += e._count._all;
  }
  for (const o of orders) { const r = get(sourceKey(o.utmSource, o.refCode)); r.orders++; r.kobo += o.totalKobo; }
  const rows = [...by.entries()].sort((a, b) => b[1].visitors - a[1].visitors || b[1].orders - a[1].orders);
  const total = rows.reduce((t, [, r]) => ({ visitors: t.visitors + r.visitors, adds: t.adds + r.adds, checkouts: t.checkouts + r.checkouts, orders: t.orders + r.orders, kobo: t.kobo + r.kobo }), blank());

  return (
    <>
      <PageHeader title="Funnel by source" subtitle="Visitors, add to cart, checkout started and paid orders, grouped by where people came from." actions={<>{RANGES.map((d) => <Link key={d} href={`/admin/funnel?days=${d}`} className={btnGhost}>{d} days{d === days ? " ✓" : ""}</Link>)}</>} />
      {rows.length === 0 ? <Empty title="Nothing counted yet" hint="Counting starts once this kit is live. Visits and cart steps appear here as people use the shop." /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full">
            <thead><tr><th className={th}>Source</th><th className={th}>Visitors</th><th className={th}>Added to cart</th><th className={th}>Checkout started</th><th className={th}>Paid orders</th><th className={th}>Sales</th><th className={th}>Visit to paid</th></tr></thead>
            <tbody>
              {[...rows, ["All sources", total] as [string, Row]].map(([k, r]) => (
                <tr key={k} className={k === "All sources" ? "border-t border-white/20 font-semibold" : "border-t border-white/10"}>
                  <td className={td}>{k}</td><td className={td}>{r.visitors}</td><td className={td}>{r.adds}</td><td className={td}>{r.checkouts}</td><td className={td}>{r.orders}</td><td className={td}>{formatNaira(r.kobo)}</td><td className={td}>{pct(r.orders, r.visitors)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 max-w-3xl text-sm text-[#9A9585]">Visitors, cart adds and checkout starts are each counted once per browser per day. Orders without a tag show as direct. A source is the ad&apos;s utm_source, or the tracked link code. Orders are counted by when they were placed.</p>
    </>
  );
}
