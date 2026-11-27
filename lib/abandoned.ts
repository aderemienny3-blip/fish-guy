import { db } from "@/lib/db";
import { PAID_STATUSES } from "@/lib/admin/orders";

export type AbandonedRow = { phone: string; name: string; email: string; totalKobo: number; items: string; at: Date; reference: string };

/** Customers whose last order expired unpaid in the last N days and who have not paid for anything since. One row per customer. */
export async function abandonedOrders(days = 14): Promise<AbandonedRow[]> {
  const since = new Date(Date.now() - days * 86_400_000);
  const expired = await db.order.findMany({
    where: { status: "EXPIRED", createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { reference: true, contactName: true, contactPhone: true, contactEmail: true, totalKobo: true, createdAt: true, items: { select: { nameSnapshot: true, quantity: true } } },
  });
  const phones = [...new Set(expired.map((o) => o.contactPhone))];
  const paid = await db.order.findMany({ where: { contactPhone: { in: phones }, status: { in: PAID_STATUSES }, createdAt: { gte: since } }, select: { contactPhone: true, createdAt: true } });
  const lastPaid = new Map<string, Date>();
  for (const p of paid) if (!lastPaid.has(p.contactPhone) || p.createdAt > lastPaid.get(p.contactPhone)!) lastPaid.set(p.contactPhone, p.createdAt);

  const seen = new Set<string>();
  const out: AbandonedRow[] = [];
  for (const o of expired) {
    if (seen.has(o.contactPhone)) continue;
    seen.add(o.contactPhone);
    const paidAfter = lastPaid.get(o.contactPhone);
    if (paidAfter && paidAfter >= o.createdAt) continue;
    out.push({ phone: o.contactPhone, name: o.contactName, email: o.contactEmail, totalKobo: o.totalKobo, items: o.items.map((i) => `${i.quantity} × ${i.nameSnapshot}`).join(", "), at: o.createdAt, reference: o.reference });
  }
  return out;
}
