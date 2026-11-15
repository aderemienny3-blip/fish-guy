import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { STATUS_LABEL } from "@/lib/admin/orders";
import { fmtDateTime, fmtDay } from "@/lib/admin/format";
import { formatNaira } from "@/lib/money";
import { Empty, PageHeader, StatusBadge, btn, btnGhost, card, input, td, th } from "@/components/admin/ui";

const TABS: { status?: OrderStatus; label: string }[] = [
  { label: "All" },
  { status: "PAID", label: "To pack" },
  { status: "PREPARING", label: "Being packed" },
  { status: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { status: "DELIVERED", label: "Delivered" },
  { status: "PENDING_PAYMENT", label: "Awaiting payment" },
  { status: "REFUNDED", label: "Refund needed" },
  { status: "CANCELLED", label: "Cancelled" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string; q?: string }>;
}) {
  await requireAdmin();
  const { status, date, q } = await searchParams;

  const where: Prisma.OrderWhereInput = {};
  if (status && status in STATUS_LABEL) where.status = status as OrderStatus;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) where.deliveryDate = date;
  if (q?.trim()) {
    const term = q.trim();
    const digits = term.replace(/\D/g, "");
    where.OR = [
      { reference: { contains: term, mode: "insensitive" } },
      { contactName: { contains: term, mode: "insensitive" } },
      ...(digits.length >= 4 ? [{ contactPhone: { contains: digits } }] : []),
    ];
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { zone: true, slot: true, items: { select: { quantity: true } } },
  });

  const keep = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status, date, q, ...extra };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="Newest first. Showing up to 100."
        actions={<Link href="/admin/orders/manifest" className={btnGhost}>Delivery manifest</Link>}
      />

      <nav className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = (t.status ?? "") === (status ?? "");
          return (
            <Link
              key={t.label}
              href={keep({ status: t.status })}
              className={`rounded-full border px-3 py-1 text-sm ${
                active ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5C84C]" : "border-white/15 text-[#9A9585] hover:text-[#F5F1E6]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <form className="mb-4 flex flex-wrap gap-2" method="get">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="Search reference, name or phone" className={`${input} max-w-xs`} />
        <input name="date" type="date" defaultValue={date} className={`${input} max-w-[11rem]`} title="Delivery date" />
        <button type="submit" className={btn}>Filter</button>
        {(q || date) && <Link href={keep({ q: undefined, date: undefined })} className={btnGhost}>Clear</Link>}
      </form>

      {orders.length === 0 ? (
        <Empty
          title="No orders found"
          hint={status || q || date ? "Try clearing the filters." : "Orders will appear here as soon as customers check out."}
        />
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-white/10">
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Customer</th>
                <th className={th}>Delivery</th>
                <th className={th}>Total</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-white/[0.03]">
                  <td className={td}>
                    <Link href={`/admin/orders/${o.reference}`} className="font-medium text-[#D4AF37] hover:underline">
                      {o.reference}
                    </Link>
                    <p className="text-xs text-[#9A9585]">{fmtDateTime(o.createdAt)}</p>
                  </td>
                  <td className={td}>
                    {o.contactName}
                    <p className="text-xs text-[#9A9585]">{o.contactPhone}</p>
                  </td>
                  <td className={td}>
                    {fmtDay(o.deliveryDate)}, {o.slot.label}
                    <p className="text-xs text-[#9A9585]">
                      {o.zone.name} · {o.items.reduce((a, i) => a + i.quantity, 0)} items
                    </p>
                  </td>
                  <td className={td}>{formatNaira(o.totalKobo)}</td>
                  <td className={td}><StatusBadge status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
