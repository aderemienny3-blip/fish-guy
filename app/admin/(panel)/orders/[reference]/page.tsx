import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { ADVANCE_LABEL, canAdvance, canCancel } from "@/lib/admin/orders";
import { fmtDateTime, fmtDay } from "@/lib/admin/format";
import { formatNaira } from "@/lib/money";
import PrintButton from "@/components/admin/PrintButton";
import { waLink, waMessages, suggestedKeys } from "@/lib/admin/whatsapp";
import { Banner, PageHeader, StatusBadge, btn, btnDanger, btnGhost, card, td, th } from "@/components/admin/ui";
import { advanceOrder, cancelOrder } from "../actions";

export default async function OrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await requireAdmin();
  const { reference } = await params;
  const { error } = await searchParams;

  const order = await db.order.findUnique({
    where: { reference },
    include: { items: true, zone: true, slot: true, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) notFound();

  const advance = canAdvance(admin.role, order.status);
  const cancel = canCancel(admin.role, order.status);
  const msgs = waMessages({ contactName: order.contactName, reference: order.reference, slotLabel: order.slot.label, day: fmtDay(order.deliveryDate), status: order.status });
  const keys = suggestedKeys(order.status);
  const wa = keys.map((k) => msgs.find((m) => m.key === k)!).filter(Boolean);

  return (
    <>
      <PageHeader
        title={`Order ${order.reference}`}
        subtitle={`Placed ${fmtDateTime(order.createdAt)}`}
        actions={
          <>
            <Link href="/admin/orders" className={`${btnGhost} print:hidden`}>Back</Link>
            <PrintButton>Print packing slip</PrintButton>
          </>
        }
      />

      {error && <Banner>{error}</Banner>}
      {order.status === "REFUNDED" && (
        <Banner>
          This customer paid after their stock hold expired and the items were no longer available. Refund them from the
          payment dashboard (Paystack).
        </Banner>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <StatusBadge status={order.status} />
        {advance && (
          <form action={advanceOrder}>
            <input type="hidden" name="reference" value={order.reference} />
            <button type="submit" className={btn}>{ADVANCE_LABEL[order.status]}</button>
          </form>
        )}
        {cancel && (
          <form action={cancelOrder}>
            <input type="hidden" name="reference" value={order.reference} />
            <button type="submit" className={btnDanger}>Cancel order</button>
          </form>
        )}
      </div>
      {cancel && order.status !== "PENDING_PAYMENT" && (
        <p className="-mt-3 mb-6 text-xs text-[#9A9585] print:hidden">
          Cancelling returns the items to stock. If the customer already paid, refund them from your payment dashboard (Paystack).
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={`${card} p-5 lg:col-span-2`}>
          <h2 className="mb-3 font-serif text-xl">Items</h2>
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className={th}>Product</th>
                <th className={`${th} text-right`}>Qty</th>
                <th className={`${th} text-right`}>Price</th>
                <th className={`${th} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className={td}>{i.nameSnapshot}</td>
                  <td className={`${td} text-right`}>{i.quantity}</td>
                  <td className={`${td} text-right`}>{formatNaira(i.unitPriceKobo)}</td>
                  <td className={`${td} text-right`}>{formatNaira(i.unitPriceKobo * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-[#9A9585]">Subtotal</dt><dd>{formatNaira(order.subtotalKobo)}</dd></div>
            {order.discountKobo > 0 && <div className="flex justify-between"><dt className="text-[#9A9585]">Student discount</dt><dd>-{formatNaira(order.discountKobo)}</dd></div>}
            {order.promoDiscountKobo > 0 && <div className="flex justify-between"><dt className="text-[#9A9585]">Festive deal</dt><dd>-{formatNaira(order.promoDiscountKobo)}</dd></div>}
            {order.giftName && <div className="flex justify-between font-semibold text-[#D4AF37]"><dt>PACK A GIFT</dt><dd>{order.giftName}</dd></div>}
            <div className="flex justify-between"><dt className="text-[#9A9585]">Delivery ({order.zone.name})</dt><dd>{formatNaira(order.deliveryFeeKobo)}</dd></div>
            <div className="flex justify-between text-base font-semibold"><dt>Total</dt><dd className="text-[#D4AF37]">{formatNaira(order.totalKobo)}</dd></div>
          </dl>
        </section>

        <div className="space-y-6">
          <section className={`${card} p-5`}>
            <h2 className="mb-3 font-serif text-xl">Deliver to</h2>
            <p className="font-medium">{order.contactName}</p>
            <p className="text-sm">{order.contactPhone}</p>
            <p className="text-sm text-[#9A9585]">{order.contactEmail}</p>
            <p className="mt-3 text-sm">{order.addressLine}</p>
            {order.landmark && <p className="text-sm text-[#9A9585]">Landmark: {order.landmark}</p>}
            <p className="mt-3 text-sm">
              <strong>{fmtDay(order.deliveryDate)}</strong>, {order.slot.label}
            </p>
            {order.notes && <p className="mt-3 rounded-md border border-white/10 p-2 text-sm">Note: {order.notes}</p>}
            <Link
              href={`/admin/customers/${order.contactPhone}`}
              className="mt-3 inline-block text-sm text-[#D4AF37] hover:underline print:hidden"
            >
              View customer
            </Link>
          </section>

          {order.status !== "PENDING_PAYMENT" && order.status !== "EXPIRED" && (
            <section className={`${card} p-5 print:hidden`}>
              <h2 className="mb-1 font-serif text-xl">Message customer</h2>
              <p className="mb-3 text-xs text-[#9A9585]">Opens WhatsApp with the message ready. You press Send.</p>
              <div className="flex flex-col gap-2">
                {wa.map((m, i) => (
                  <a key={m.key} href={waLink(order.contactPhone, m.text)} target="_blank" rel="noreferrer" className={i === 0 ? btn : btnGhost}>
                    WhatsApp: {m.label}
                  </a>
                ))}
                <a href={`tel:+${order.contactPhone}`} className={btnGhost}>Call {order.contactPhone}</a>
              </div>
            </section>
          )}

          <section className={`${card} p-5 print:hidden`}>
            <h2 className="mb-3 font-serif text-xl">Payment</h2>
            {order.payments.length === 0 ? (
              <p className="text-sm text-[#9A9585]">No payment started.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {order.payments.map((p) => (
                  <li key={p.id}>
                    <p>{p.status} · {formatNaira(p.amountKobo)}{p.method ? ` · ${p.method}` : ""}</p>
                    {p.providerRef && <p className="break-all text-xs text-[#9A9585]">Paystack ref: {p.providerRef}</p>}
                  </li>
                ))}
              </ul>
            )}
            {order.paidAt && <p className="mt-3 text-xs text-[#9A9585]">Paid {fmtDateTime(order.paidAt)}</p>}
          </section>
        </div>
      </div>
    </>
  );
}
