import { db } from "@/lib/db";
import { getSettings } from "@/lib/admin/settings";
import { SEGMENTS, getCustomers, type Segment } from "@/lib/admin/segments";

export const BROADCAST_TEMPLATE = () => process.env.WHATSAPP_BROADCAST_TEMPLATE || "fish_guy_broadcast";
export const MAX_PER_SEND = 100;

/** Customers in a segment who agreed to offers. People who said STOP, or never ticked the box, are never included. */
export async function broadcastRecipients(segment: string | null) {
  const seg = SEGMENTS.includes(segment as Segment) ? (segment as Segment) : null;
  const customers = (await getCustomers(await getSettings())).filter((c) => !seg || c.segment === seg);
  const consent = await db.messagingConsent.findMany({ where: { marketing: true, phone: { in: customers.map((c) => c.phone) } }, select: { phone: true } });
  const ok = new Set(consent.map((c) => c.phone));
  const recent = await db.messageLog.findMany({ where: { kind: BROADCAST_TEMPLATE(), ok: true, createdAt: { gt: new Date(Date.now() - 12 * 3_600_000) } }, select: { to: true } });
  const skip = new Set(recent.map((r) => r.to));
  const eligible = customers.filter((c) => ok.has(c.phone));
  return { total: customers.length, consenting: eligible.length, recipients: eligible.filter((c) => !skip.has(c.phone)) };
}
