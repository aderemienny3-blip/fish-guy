import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { settleOrder } from "@/lib/payments";
import { naira } from "@/lib/shop/format";
import { ClearCart } from "@/components/shop/clear-cart";

export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Waiting for payment",
  PAID: "Payment confirmed",
  PREPARING: "Being packed",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  EXPIRED: "Payment window expired",
  REFUNDED: "Refund in progress",
};
const STEPS = ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
const PAID_STATES = new Set<string>(STEPS);

export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!/^FG-[A-F0-9]{16}$/.test(reference)) notFound();

  // Covers the customer returning from Monnify before the webhook arrives.
  try { await settleOrder(reference); } catch { /* show current state; the webhook will catch up */ }

  const order = await db.order.findUnique({ where: { reference }, include: { items: true, zone: true, slot: true } });
  if (!order) notFound();
  const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP ?? "").replace(/\D/g, "");
  const stepIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const day = new Intl.DateTimeFormat("en-NG", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(order.deliveryDate + "T00:00:00Z"));

  return (
    <main className="page-width utility-page order-page">
      {PAID_STATES.has(order.status) && <ClearCart />}
      <p className="eyebrow">ORDER {order.reference}</p>
      <h1>{LABEL[order.status] ?? order.status}</h1>

      {order.status === "PENDING_PAYMENT" && (
        <p className="utility-intro">We have not received your payment yet. If you already paid, this page updates within a minute. Refresh to check again.</p>
      )}
      {(order.status === "EXPIRED" || order.status === "CANCELLED") && (
        <p className="utility-intro">This order was not paid in time. Your items were released, so you can place the order again from the shop.</p>
      )}

      {stepIndex >= 0 && (
        <ol className="order-steps" aria-label="Order progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i <= stepIndex ? "is-done" : ""} aria-current={i === stepIndex ? "step" : undefined}>{LABEL[s]}</li>
          ))}
        </ol>
      )}

      <section className="order-card">
        <h2>Items</h2>
        <ul className="summary-lines">
          {order.items.map((i) => (
            <li key={i.id}><span>{i.nameSnapshot} <small>× {i.quantity}</small></span><strong>{naira(i.unitPriceKobo * i.quantity)}</strong></li>
          ))}
        </ul>
        <dl className="summary-totals">
          {order.discountKobo > 0 && <div className="summary-discount"><dt>Student discount</dt><dd>-{naira(order.discountKobo)}</dd></div>}
          {order.promoDiscountKobo > 0 && <div className="summary-discount"><dt>Festive deal</dt><dd>-{naira(order.promoDiscountKobo)}</dd></div>}
          {order.giftName && <div className="summary-gift"><dt>Free gift</dt><dd>{order.giftName}</dd></div>}
          <div><dt>Delivery ({order.zone.name})</dt><dd>{naira(order.deliveryFeeKobo)}</dd></div>
          <div className="summary-grand"><dt>Total</dt><dd>{naira(order.totalKobo)}</dd></div>
        </dl>
      </section>

      <section className="order-card">
        <h2>Delivery</h2>
        <p>{day}, {order.slot.label}</p>
        <p>{order.addressLine}{order.landmark ? `, near ${order.landmark}` : ""}</p>
      </section>

      <div className="student-actions">
        <Link href="/shop" className="button button-outline">Continue shopping</Link>
        {whatsapp && (
          <a className="button button-gold" target="_blank" rel="noreferrer" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hello Fish Guy, my order is ${order.reference}.`)}`}>
            Chat with us on WhatsApp
          </a>
        )}
      </div>
    </main>
  );
}
