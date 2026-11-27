import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { sendTemplateMessage, whatsappConfigured } from "@/lib/whatsapp";
import { stopUrl } from "@/lib/optout";
import { PAID_STATUSES } from "@/lib/admin/orders";

export const UNPAID_FIRST_AFTER_MIN = 8;
export const UNPAID_SECOND_AFTER_MIN = 22;
export const REORDER_AFTER_DAYS = 14;
export const REORDER_STOP_AFTER_DAYS = 60;
export const REORDER_GAP_DAYS = 30;
const BATCH = 40;

/** Which unpaid-order reminder is due now: 1, 2 or 0 for none. Pure, so it can be tested. */
export function nextUnpaidReminder(o: { createdAt: Date; expiresAt: Date | null; reminder1At: Date | null; reminder2At: Date | null }, now = new Date()): 0 | 1 | 2 {
  if (!o.expiresAt) return 0;
  const age = (now.getTime() - o.createdAt.getTime()) / 60_000;
  const left = (o.expiresAt.getTime() - now.getTime()) / 60_000;
  if (!o.reminder1At && age >= UNPAID_FIRST_AFTER_MIN && left > 4) return 1;
  if (!o.reminder2At && age >= UNPAID_SECOND_AFTER_MIN && left > 1) return 2;
  return 0;
}

/** True when a customer's last paid order is old enough to nudge and not so old that they have probably moved on. */
export function reorderDue(lastOrderAt: Date, lastReminderAt: Date | null, now = new Date()): boolean {
  const days = (now.getTime() - lastOrderAt.getTime()) / 86_400_000;
  if (days < REORDER_AFTER_DAYS || days > REORDER_STOP_AFTER_DAYS) return false;
  return !lastReminderAt || (now.getTime() - lastReminderAt.getTime()) / 86_400_000 >= REORDER_GAP_DAYS;
}

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";
const first = (name: string) => name.trim().split(/\s+/)[0] || "there";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const mail = (title: string, body: string, foot = "") =>
  `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;background:#0A0A0A;color:#F5F1E6"><h2 style="color:#D4AF37;margin:0 0 12px">${esc(title)}</h2>${body}${foot ? `<p style="margin-top:24px;font-size:12px;color:#9A9585">${foot}</p>` : ""}</div>`;

/** Up to two reminders for orders still waiting for payment: shortly after checkout, and again before the items are released. */
export async function runUnpaidReminders(now = new Date()) {
  const rows = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { gt: now }, createdAt: { lt: new Date(now.getTime() - UNPAID_FIRST_AFTER_MIN * 60_000) } },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    select: { id: true, reference: true, contactName: true, contactEmail: true, contactPhone: true, createdAt: true, expiresAt: true, reminder1At: true, reminder2At: true },
  });
  let sent = 0;
  for (const o of rows) {
    const due = nextUnpaidReminder(o, now);
    if (!due) continue;
    // Guarded update: if two runs overlap, only one of them gets to send.
    const claim = await db.order.updateMany({ where: { id: o.id, status: "PENDING_PAYMENT", ...(due === 1 ? { reminder1At: null } : { reminder2At: null }) }, data: due === 1 ? { reminder1At: now } : { reminder2At: now } });
    if (claim.count === 0) continue;
    const left = Math.max(1, Math.round(((o.expiresAt?.getTime() ?? now.getTime()) - now.getTime()) / 60_000));
    const link = `${site()}/order/${o.reference}`;
    if (whatsappConfigured()) {
      await sendTemplateMessage(o.contactPhone, process.env.WHATSAPP_PAYMENT_TEMPLATE || "fish_guy_payment_reminder", [first(o.contactName), o.reference, String(left)], o.reference, o.reference);
    }
    await sendEmail(o.contactEmail, `Your Fish Guy order ${o.reference} is waiting for payment`, mail("Your order is waiting", `<p>Hi ${esc(first(o.contactName))}, we are holding your items for about ${left} more minute${left === 1 ? "" : "s"}. Pay now so they are not released.</p><p><a href="${link}" style="display:inline-block;background:#D4AF37;color:#0A0A0A;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Pay now</a></p>`, "If you already paid, ignore this message. It can take a minute or two to show."));
    sent++;
  }
  return { checked: rows.length, sent };
}

/** A nudge to customers who agreed to offers and have not ordered for a while. Never to anyone who has not opted in. */
export async function runReorderReminders(now = new Date()) {
  const gapAgo = new Date(now.getTime() - REORDER_GAP_DAYS * 86_400_000);
  const people = await db.messagingConsent.findMany({ where: { marketing: true, OR: [{ lastReorderAt: null }, { lastReorderAt: { lt: gapAgo } }] }, take: 200 });
  let sent = 0;
  for (const p of people) {
    if (sent >= BATCH) break;
    const last = await db.order.findFirst({ where: { contactPhone: p.phone, status: { in: [...PAID_STATUSES, "PENDING_PAYMENT"] } }, orderBy: { createdAt: "desc" }, select: { status: true, createdAt: true, contactName: true, contactEmail: true } });
    if (!last || last.status === "PENDING_PAYMENT" || !reorderDue(last.createdAt, p.lastReorderAt, now)) continue;
    const claim = await db.messagingConsent.updateMany({ where: { phone: p.phone, marketing: true, OR: [{ lastReorderAt: null }, { lastReorderAt: { lt: gapAgo } }] }, data: { lastReorderAt: now } });
    if (claim.count === 0) continue;
    if (whatsappConfigured()) await sendTemplateMessage(p.phone, process.env.WHATSAPP_REORDER_TEMPLATE || "fish_guy_reorder", [first(last.contactName)], "account", "reorder");
    await sendEmail(last.contactEmail, "Time to restock your freezer?", mail("Restock your freezer", `<p>Hi ${esc(first(last.contactName))}, it has been a while since your last Fish Guy order. Your past orders are saved, so you can order the same again in a few taps.</p><p><a href="${site()}/account" style="display:inline-block;background:#D4AF37;color:#0A0A0A;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Order again</a></p>`, `You are getting this because you agreed to offers at checkout. <a href="${stopUrl(p.phone)}" style="color:#9A9585">Stop these messages</a>.`));
    sent++;
  }
  return { checked: people.length, sent };
}
