import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { PAID_STATUSES, STATUS_LABEL } from "@/lib/admin/orders";
import { getCustomers, SEGMENTS, SEGMENT_LABEL } from "@/lib/admin/segments";
import { fmtDay, lagosDateOf, lagosDayStart } from "@/lib/admin/format";
import { addDays, lagosNow } from "@/lib/delivery";
import { formatNaira } from "@/lib/money";
import { Empty, PageHeader, Stat, card, btnGhost } from "@/components/admin/ui";

export default async function Overview() {
  const admin = await requireAdmin();
  if (admin.role === "PACKER" || admin.role === "RIDER") redirect("/admin/orders");

  const settings = await getSettings();
  const today = lagosNow().date;
  const startToday = lagosDayStart(today);
  const start7 = lagosDayStart(addDays(today, -6));
  const start30 = new Date(Date.now() - 30 * 86_400_000);

  const [paid7, statusCounts, lowStock, top, customers, productCount] = await Promise.all([
    db.order.findMany({
      where: { status: { in: PAID_STATUSES }, createdAt: { gte: start7 } },
      select: { totalKobo: true, createdAt: true },
    }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
    db.product.findMany({
      where: { active: true, stockQty: { lte: settings.lowStockThreshold } },
      orderBy: { stockQty: "asc" },
      take: 8,
      select: { id: true, name: true, stockQty: true },
    }),
    db.orderItem.groupBy({
      by: ["productId", "nameSnapshot"],
      where: { order: { status: { in: PAID_STATUSES }, createdAt: { gte: start30 } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    getCustomers(settings),
    db.product.count(),
  ]);

  const todays = paid7.filter((o) => o.createdAt >= startToday);
  const todayRevenue = todays.reduce((a, o) => a + o.totalKobo, 0);
  const aov = todays.length ? Math.round(todayRevenue / todays.length) : 0;

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const byDay = new Map(days.map((d) => [d, 0]));
  for (const o of paid7) {
    const d = lagosDateOf(o.createdAt);
    if (byDay.has(d)) byDay.set(d, (byDay.get(d) ?? 0) + o.totalKobo);
  }
  const maxDay = Math.max(1, ...byDay.values());
  const weekTotal = [...byDay.values()].reduce((a, b) => a + b, 0);

  const count = (s: string) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;
  const segCount = (s: string) => customers.filter((c) => c.segment === s).length;
  const noData = productCount === 0;

  return (
    <>
      <PageHeader title="Overview" subtitle="Live numbers from your real orders." />

      {noData && (
        <Empty
          title="Your shop is empty"
          hint="Add your first products and delivery areas to start taking orders."
          action={<Link href="/admin/products/new" className={btnGhost}>Add a product</Link>}
        />
      )}

      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${noData ? "mt-6" : ""}`}>
        <Stat label="Revenue today" value={formatNaira(todayRevenue)} hint="Paid orders, incl. delivery" />
        <Stat label="Orders today" value={todays.length} hint={todays.length ? `Average ${formatNaira(aov)}` : "No paid orders yet"} />
        <Stat label="To pack now" value={count("PAID")} hint="Paid, not yet started" />
        <Stat label="Out for delivery" value={count("OUT_FOR_DELIVERY")} hint={`${count("PREPARING")} being packed`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className={`${card} p-5 lg:col-span-2`}>
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl">Last 7 days</h2>
            <p className="text-sm text-[#9A9585]">{formatNaira(weekTotal)} total</p>
          </div>
          <ul className="mt-4 space-y-2">
            {days.map((d) => {
              const v = byDay.get(d) ?? 0;
              return (
                <li key={d} className="grid grid-cols-[6rem_1fr_7rem] items-center gap-3 text-sm">
                  <span className="text-[#9A9585]">{fmtDay(d)}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-white/5">
                    <span className="block h-full rounded-full bg-[#D4AF37]" style={{ width: `${(v / maxDay) * 100}%` }} />
                  </span>
                  <span className="text-right">{formatNaira(v)}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-serif text-xl">Customers</h2>
          {customers.length === 0 ? (
            <p className="mt-3 text-sm text-[#9A9585]">Customers appear here after their first paid order.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {SEGMENTS.map((s) => (
                <li key={s} className="flex justify-between">
                  <Link href={`/admin/customers?segment=${s}`} className="hover:text-[#D4AF37]">
                    {SEGMENT_LABEL[s]}
                  </Link>
                  <span className="text-[#9A9585]">{segCount(s)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-serif text-xl">Top products, 30 days</h2>
          {top.length === 0 ? (
            <p className="mt-3 text-sm text-[#9A9585]">No sales yet.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {top.map((t) => (
                <li key={t.productId} className="flex justify-between gap-3">
                  <span className="truncate">{t.nameSnapshot}</span>
                  <span className="text-[#9A9585]">{t._sum.quantity} sold</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-serif text-xl">Low stock</h2>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-[#9A9585]">
              {productCount === 0 ? "No products yet." : `Nothing at or below ${settings.lowStockThreshold}.`}
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {lowStock.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <Link href={`/admin/products/${p.id}`} className="truncate hover:text-[#D4AF37]">{p.name}</Link>
                  <span className={p.stockQty === 0 ? "text-red-300" : "text-orange-300"}>
                    {p.stockQty === 0 ? "Sold out" : `${p.stockQty} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} p-5`}>
          <h2 className="font-serif text-xl">Needs attention</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex justify-between"><span>{STATUS_LABEL.REFUNDED}</span><span className={count("REFUNDED") ? "text-red-300" : "text-[#9A9585]"}>{count("REFUNDED")}</span></li>
            <li className="flex justify-between"><span>{STATUS_LABEL.PENDING_PAYMENT}</span><span className="text-[#9A9585]">{count("PENDING_PAYMENT")}</span></li>
          </ul>
          <Link href="/admin/orders" className={`${btnGhost} mt-4`}>Open orders</Link>
        </section>
      </div>
    </>
  );
}
