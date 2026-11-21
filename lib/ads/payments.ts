import { db } from "@/lib/db";
import { addDays, lagosNow } from "@/lib/delivery";
import { fetchPaystackAsTxn } from "@/lib/paystack";
import { mailPaid } from "@/lib/ads/mail";

/** Dates actually used if payment happens after the requested start has passed. */
export function effectiveDates(c: { startDate: string; endDate: string; durationDays: number }) {
  const today = lagosNow().date;
  if (c.startDate >= today) return { startDate: c.startDate, endDate: c.endDate };
  return { startDate: today, endDate: addDays(today, c.durationDays - 1) };
}

/** How many campaigns of this package already overlap these dates. */
export function overlapCount(packageId: string, startDate: string, endDate: string, statuses: ("APPROVED" | "PAID")[], excludeId?: string) {
  return db.adCampaign.count({
    where: { packageId, status: { in: statuses }, startDate: { lte: endDate }, endDate: { gte: startDate }, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}

/**
 * Idempotent: safe from the webhook and from the status page after the artist returns from Paystack.
 * Marks PAID only after Paystack confirms the status, reference and exact amount.
 */
export async function confirmAdPayment(paymentRef: string): Promise<boolean> {
  const c = await db.adCampaign.findUnique({ where: { paymentRef } });
  if (!c) return false;
  if (c.status === "PAID") return true;
  if (c.status !== "APPROVED" || !c.paymentRef) return false;

  const txn = await fetchPaystackAsTxn(c.paymentRef);
  const paidKobo = Math.round(Number(txn.amountPaid) * 100);
  if (txn.paymentStatus !== "PAID" || txn.paymentReference !== c.paymentRef || paidKobo !== c.priceKobo) return false;

  const dates = effectiveDates(c);
  const r = await db.adCampaign.updateMany({ where: { id: c.id, status: "APPROVED" }, data: { status: "PAID", paidAt: new Date(), ...dates } });
  if (r.count > 0) {
    try { await mailPaid({ ...c, ...dates }); } catch (e) { console.error("ad paid mail failed", e); }
  }
  return true;
}
