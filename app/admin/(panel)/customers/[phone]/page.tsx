import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { PAID_STATUSES } from "@/lib/admin/orders";
import { classify } from "@/lib/admin/segments";
import { daysSince, fmtDateTime } from "@/lib/admin/format";
import { formatNaira } from "@/lib/money";
import { PageHeader, SegmentBadge, Stat, StatusBadge, btnGhost, card, td, th } from "@/components/admin/ui";

export default async function CustomerProfile({ params }: { params: Promise<{ phone: string }> }) {
  await requireAdmin(MANAGERS);
  const { phone } = await params;
  if (!/^\d{8,15}$/.test(phone)) notFound();

  const settings = await getSettings();
  const orders = await db.order.findMany({
    where: { contactPhone: phone },
    orderBy: { createdAt: "desc" },
    include: { zone: true, items: true },
  });
  if (orders.length === 0) notFound();

  const paid = orders.filter((o) => PAID_STATUSES.includes(o.status));
  const spend = paid.reduce((a, o) => a + o.totalKobo, 0);
  const windowStart = new Date(Date.now() - settings.superBuyerWindowDays * 86_400_000);
  const latest = orders[0];

  const segment = paid.length
    ? classify(
        {
          orders: paid.length,
          spendKobo: spend,
          firstAt: paid[paid.length - 1].createdAt,
          lastAt: paid[0].createdAt,
          recentOrders: paid.filter((o) => o.createdAt >= windowStart).length,
        },
        settings
      )
    : null;

  const favourites = await db.orderItem.groupBy({
    by: ["nameSnapshot"],
    where: { order: { contactPhone: phone, status: { in: PAID_STATUSES } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });

  const zones = new Map<string, number>();
  for (const o of paid) zones.set(o.zone.name, (zones.get(o.zone.name) ?? 0) + 1);
  const topZone = [...zones.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <>
      <PageHeader
        title={latest.contactName}
        subtitle={`${phone} · ${latest.contactEmail}`}
        actions={<Link href="/admin/customers" className={btnGhost}>All customers</Link>}
      />

      <div className="mb-6 flex items-center gap-3">
        {segment ? <SegmentBadge segment={segment} /> : <span className="text-sm text-[#9A9585]">No paid orders yet</span>}
        {paid.length > 0 && (
          <span className="text-sm text-[#9A9585]">Last order {daysSince(paid[0].createdAt)} days ago</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Lifetime spend" value={formatNaira(spend)} />
        <Stat label="Paid orders" value={paid.length} />
        <Stat label="Average order" value={paid.length ? formatNaira(Math.round(spend / paid.length)) : "None yet"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className={`${card} p-5`}>
          <h2 className="font-serif text-xl">What they buy</h2>
          {favourites.length === 0 ? (
            <p className="mt-3 text-sm text-[#9A9585]">Nothing yet.</p>
          ) : (
            <ol className="mt-3 space-y-2 text-sm">
              {favourites.map((f) => (
                <li key={f.nameSnapshot} className="flex justify-between gap-3">
                  <span className="truncate">{f.nameSnapshot}</span>
                  <span className="text-[#9A9585]">{f._sum.quantity}</span>
                </li>
              ))}
            </ol>
          )}
          {topZone && <p className="mt-4 text-sm text-[#9A9585]">Usually delivered to {topZone}.</p>}
        </section>

        <section className={`${card} overflow-x-auto p-5 lg:col-span-2`}>
          <h2 className="mb-3 font-serif text-xl">Order history</h2>
          <table className="w-full min-w-[480px]">
            <thead className="border-b border-white/10">
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Date</th>
                <th className={`${th} text-right`}>Total</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className={td}>
                    <Link href={`/admin/orders/${o.reference}`} className="text-[#D4AF37] hover:underline">{o.reference}</Link>
                  </td>
                  <td className={`${td} text-[#9A9585]`}>{fmtDateTime(o.createdAt)}</td>
                  <td className={`${td} text-right`}>{formatNaira(o.totalKobo)}</td>
                  <td className={td}><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
