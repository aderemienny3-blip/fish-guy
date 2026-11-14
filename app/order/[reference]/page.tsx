import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { settleOrder } from "@/lib/payments";
import { formatNaira } from "@/lib/money";

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

export default async function OrderPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;

  // Covers the case where the customer returns before the webhook arrives.
  try {
    await settleOrder(reference);
  } catch {
    /* show current state; webhook will catch up */
  }

  const order = await db.order.findUnique({
    where: { reference },
    include: { items: true, zone: true, slot: true },
  });
  if (!order) notFound();

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 text-neutral-100">
      <p className="text-sm text-neutral-400">Order {order.reference}</p>
      <h1 className="mt-1 text-3xl font-semibold">{LABEL[order.status]}</h1>

      {order.status === "PENDING_PAYMENT" && (
        <p className="mt-3 text-neutral-300">
          We haven&apos;t received your payment yet. If you already paid, this page updates within a minute.
        </p>
      )}

      <section className="mt-8 space-y-2 rounded-lg border border-neutral-800 p-5">
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between text-sm">
            <span>
              {i.nameSnapshot} × {i.quantity}
            </span>
            <span>{formatNaira(i.unitPriceKobo * i.quantity)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-neutral-800 pt-2 text-sm text-neutral-400">
          <span>Delivery ({order.zone.name})</span>
          <span>{formatNaira(order.deliveryFeeKobo)}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatNaira(order.totalKobo)}</span>
        </div>
      </section>

      <section className="mt-6 text-sm text-neutral-300">
        <p>
          Delivering on <strong>{order.deliveryDate}</strong>, {order.slot.label}
        </p>
        <p className="mt-1">{order.addressLine}</p>
      </section>
    </main>
  );
}
