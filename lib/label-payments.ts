import { db } from "@/lib/db";
import { fetchPaystackAsTxn } from "@/lib/paystack";
import { renewedUntil } from "@/lib/label-rules";

/**
 * Idempotent: safe from the webhook and from the page after the label returns from Paystack.
 * Extends the account only after Paystack itself confirms status, reference and exact amount.
 */
export async function confirmLabelPayment(reference: string): Promise<boolean> {
  const p = await db.labelPayment.findUnique({ where: { reference } });
  if (!p) return false;
  if (p.status === "PAID") return true;

  const txn = await fetchPaystackAsTxn(p.reference);
  const paidKobo = Math.round(Number(txn.amountPaid) * 100);
  if (txn.paymentStatus !== "PAID" || txn.paymentReference !== p.reference || paidKobo !== p.amountKobo) return false;

  const won = await db.labelPayment.updateMany({ where: { id: p.id, status: "PENDING" }, data: { status: "PAID", paidAt: new Date() } });
  if (won.count > 0) {
    const label = await db.label.findUnique({ where: { id: p.labelId }, select: { paidUntil: true } });
    await db.label.update({ where: { id: p.labelId }, data: { paidUntil: renewedUntil(label?.paidUntil ?? null) } });
  }
  return true;
}
