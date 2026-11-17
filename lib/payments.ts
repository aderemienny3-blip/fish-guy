import { db } from "@/lib/db";
import { fetchTransaction } from "@/lib/monnify";
import { notifyNeedsRefund, notifyOrderPaid } from "@/lib/notify";

/**
 * Idempotent: safe to call from the webhook AND the order page.
 * Marks the order PAID only after Monnify confirms the amount.
 */
export async function settleOrder(reference: string) {
  const payment = await db.payment.findUnique({
    where: { reference },
    include: { order: true },
  });
  if (!payment) return null;
  if (payment.status === "PAID") return payment.order;
  if (!payment.providerRef) return payment.order;

  const txn = await fetchTransaction(payment.providerRef);

  if (txn.paymentStatus !== "PAID") {
    if (txn.paymentStatus === "FAILED") {
      await db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", raw: txn as object } });
    }
    return payment.order;
  }

  const paidKobo = Math.round(txn.amountPaid * 100);
  if (paidKobo < payment.amountKobo) {
    // Underpayment: record it, leave the order unpaid for manual review.
    await db.payment.update({ where: { id: payment.id }, data: { raw: txn as object } });
    return payment.order;
  }

  // `fresh: true` only for the one call that actually flipped the order, so emails go out exactly once.
  const settled = await db.$transaction(async (tx) => {
    // Re-check inside the transaction so concurrent callers settle once.
    const fresh = await tx.payment.findUnique({ where: { id: payment.id } });
    if (fresh?.status === "PAID") return { order: await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } }), fresh: false };

    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "PAID", method: txn.paymentMethod ?? null, raw: txn as object },
    });

    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });

    if (order.status === "EXPIRED" || order.status === "CANCELLED") {
      // Paid after the hold lapsed: re-take stock if available, else flag for refund.
      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      let ok = true;
      for (const it of items) {
        const r = await tx.product.updateMany({
          where: { id: it.productId, stockQty: { gte: it.quantity } },
          data: { stockQty: { decrement: it.quantity } },
        });
        if (r.count === 0) ok = false;
      }
      if (!ok) {
        // Needs a manual refund from the Monnify dashboard.
        return { order: await tx.order.update({ where: { id: order.id }, data: { status: "REFUNDED", paidAt: new Date() } }), fresh: true };
      }
    }

    return { order: await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date() } }), fresh: true };
  });

  if (settled.fresh) {
    try {
      if (settled.order.status === "REFUNDED") {
        await notifyNeedsRefund(settled.order);
      } else {
        const full = await db.order.findUnique({ where: { id: settled.order.id }, include: { items: true, zone: true, slot: true } });
        if (full) await notifyOrderPaid(full);
      }
    } catch (e) {
      console.error("order notification failed", e);
    }
  }
  return settled.order;
}
