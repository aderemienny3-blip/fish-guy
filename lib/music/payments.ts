import { db } from "@/lib/db";
import { fetchPaystackAsTxn } from "@/lib/paystack";

export const MUSIC_REF = /^FGS-[A-F0-9]{32}$/;


/**
 * Idempotent: safe from the webhook, the return page and the "check again" button.
 * Marks the order PAID only after Paystack itself confirms status, reference and amount.
 */
export async function confirmMusicOrder(reference: string): Promise<boolean> {
  const order = await db.musicOrder.findUnique({ where: { reference } });
  if (!order) return false;
  if (order.status === "PAID") return true;
  if (!order.providerRef) return false;

  const txn = await fetchPaystackAsTxn(order.reference);
  const paidKobo = Math.round(Number(txn.amountPaid) * 100);
  if (txn.paymentStatus !== "PAID" || txn.paymentReference !== order.reference || paidKobo !== order.amountKobo) {
    return false;
  }
  await db.musicOrder.updateMany({
    where: { id: order.id, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date() },
  });
  const fresh = await db.musicOrder.findUnique({ where: { id: order.id }, select: { status: true } });
  return fresh?.status === "PAID";
}

export async function confirmMusicOrderForSession(reference: string, sessionHash: string) {
  const order = await db.musicOrder.findUnique({ where: { reference }, select: { buyerSessionHash: true } });
  if (!order || order.buyerSessionHash !== sessionHash) return false;
  return confirmMusicOrder(reference);
}
