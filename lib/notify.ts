import { formatNaira } from "@/lib/money";

/**
 * Email through Resend's HTTP API. Never throws: a failed email must never break an order.
 * Needs RESEND_API_KEY on Vercel. Optional: NOTIFY_FROM, ADMIN_ALERT_EMAIL (comma separated).
 */
const FROM = () => process.env.NOTIFY_FROM || "Fish Guy <onboarding@resend.dev>";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendEmail(to: string | string[], subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const list = (Array.isArray(to) ? to : [to]).map((t) => t.trim()).filter(Boolean);
  if (!key || list.length === 0) {
    console.warn("email skipped (no RESEND_API_KEY or recipient):", subject);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM(), to: list, subject, html }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) console.error("email failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("email error", e);
    return false;
  }
}

const adminList = () => (process.env.ADMIN_ALERT_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
const site = () => process.env.NEXT_PUBLIC_SITE_URL || "";

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#0A0A0A;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#F5F1E6">
<div style="max-width:560px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:28px">
<p style="margin:0 0 4px;color:#D4AF37;font-size:13px;letter-spacing:2px">FISH GUY</p>
<h1 style="margin:0 0 16px;font-size:22px;color:#F5F1E6">${esc(title)}</h1>${body}
<p style="margin:24px 0 0;font-size:12px;color:#9A9585">Fish Guy, frozen food delivered across Lagos.</p></div></body></html>`;
}

type OrderForMail = {
  reference: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  addressLine: string;
  landmark: string | null;
  notes: string | null;
  deliveryDate: string;
  subtotalKobo: number;
  discountKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  items: { nameSnapshot: string; quantity: number; unitPriceKobo: number }[];
  zone: { name: string };
  slot: { label: string };
};

const dayText = (iso: string) =>
  new Intl.DateTimeFormat("en-NG", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(iso + "T00:00:00Z"));

function itemRows(o: OrderForMail) {
  return o.items
    .map((i) => `<tr><td style="padding:6px 0">${esc(i.nameSnapshot)} × ${i.quantity}</td><td style="padding:6px 0;text-align:right">${formatNaira(i.unitPriceKobo * i.quantity)}</td></tr>`)
    .join("");
}

function totals(o: OrderForMail) {
  const row = (l: string, v: string, strong = false) =>
    `<tr><td style="padding:3px 0;color:${strong ? "#F5F1E6" : "#9A9585"}">${l}</td><td style="padding:3px 0;text-align:right;${strong ? "color:#D4AF37;font-weight:bold" : ""}">${v}</td></tr>`;
  return `<table style="width:100%;border-top:1px solid #2a2a2a;margin-top:8px">${row("Subtotal", formatNaira(o.subtotalKobo))}${
    o.discountKobo > 0 ? row("Student discount", "-" + formatNaira(o.discountKobo)) : ""
  }${row(`Delivery (${esc(o.zone.name)})`, formatNaira(o.deliveryFeeKobo))}${row("Total paid", formatNaira(o.totalKobo), true)}</table>`;
}

export async function notifyOrderPaid(o: OrderForMail) {
  const link = site() ? `${site()}/order/${o.reference}` : "";
  const customer = shell(
    "Payment received. Thank you!",
    `<p style="margin:0 0 14px">Hi ${esc(o.contactName.split(" ")[0])}, we have your order <strong>${o.reference}</strong> and we are packing it.</p>
<table style="width:100%">${itemRows(o)}</table>${totals(o)}
<p style="margin:18px 0 4px"><strong>Delivery</strong></p>
<p style="margin:0;color:#cfc9b6">${dayText(o.deliveryDate)}, ${esc(o.slot.label)}<br>${esc(o.addressLine)}${o.landmark ? `, near ${esc(o.landmark)}` : ""}</p>
${link ? `<p style="margin:22px 0 0"><a href="${link}" style="background:#D4AF37;color:#000;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Track your order</a></p>` : ""}`,
  );
  const admin = shell(
    `New paid order ${o.reference}`,
    `<p style="margin:0 0 6px"><strong>${esc(o.contactName)}</strong> · ${esc(o.contactPhone)}</p>
<p style="margin:0 0 14px;color:#cfc9b6">${dayText(o.deliveryDate)}, ${esc(o.slot.label)}<br>${esc(o.addressLine)}${o.landmark ? `, near ${esc(o.landmark)}` : ""} (${esc(o.zone.name)})${o.notes ? `<br>Note: ${esc(o.notes)}` : ""}</p>
<table style="width:100%">${itemRows(o)}</table>${totals(o)}
${site() ? `<p style="margin:22px 0 0"><a href="${site()}/admin/orders/${o.reference}" style="background:#D4AF37;color:#000;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Open in admin</a></p>` : ""}`,
  );
  await Promise.all([
    sendEmail(o.contactEmail, `Fish Guy order ${o.reference} confirmed`, customer),
    sendEmail(adminList(), `New order ${o.reference}: ${formatNaira(o.totalKobo)}`, admin),
  ]);
}

/** Customer paid after the hold lapsed and stock ran out: the owner must refund by hand. */
export async function notifyNeedsRefund(o: { reference: string; contactName: string; contactPhone: string; totalKobo: number }) {
  await sendEmail(
    adminList(),
    `ACTION NEEDED: refund order ${o.reference}`,
    shell("Refund needed", `<p>${esc(o.contactName)} (${esc(o.contactPhone)}) paid ${formatNaira(o.totalKobo)} for order <strong>${o.reference}</strong>, but the items ran out before payment arrived. Refund them from the Monnify dashboard and tell them.</p>`),
  );
}

const STATUS_COPY: Record<string, [string, string]> = {
  PREPARING: ["We're packing your order", "Your frozen food is being packed carefully for delivery."],
  OUT_FOR_DELIVERY: ["Your order is on its way", "Our rider is heading to you now. Please keep your phone close."],
  DELIVERED: ["Delivered. Enjoy!", "Your order has been delivered. Thank you for choosing Fish Guy."],
};

export async function notifyOrderStatus(o: { reference: string; contactName: string; contactEmail: string }, status: string) {
  const c = STATUS_COPY[status];
  if (!c) return;
  const link = site() ? `<p style="margin:20px 0 0"><a href="${site()}/order/${o.reference}" style="color:#D4AF37">View order ${o.reference}</a></p>` : "";
  await sendEmail(o.contactEmail, `${c[0]} · ${o.reference}`, shell(c[0], `<p>Hi ${esc(o.contactName.split(" ")[0])}, ${c[1]}</p>${link}`));
}

export async function notifyStudentDecision(
  v: { fullName: string; email: string; reference: string },
  approved: boolean,
  info: { percent?: number; reason?: string | null },
) {
  const link = site() ? `${site()}/student/${v.reference}` : "";
  const first = esc(v.fullName.split(" ")[0]);
  const body = approved
    ? `<p>Hi ${first}, you're verified. ${info.percent ? `${info.percent}% comes off the food in your orders` : "Your student discount is ready"}. Use the phone number you applied with when you check out.</p>${link ? `<p><a href="${link}" style="color:#D4AF37">Open your student page</a></p>` : ""}`
    : `<p>Hi ${first}, we could not approve your student application.</p><p style="color:#cfc9b6">Reason: ${esc(info.reason ?? "The ID could not be verified.")}</p><p>You can apply again with a clearer photo${site() ? ` at <a href="${site()}/student" style="color:#D4AF37">${site()}/student</a>` : ""}.</p>`;
  await sendEmail(v.email, approved ? "You're verified for the Fish Guy student discount" : "Your Fish Guy student application", shell(approved ? "You're verified" : "Application not approved", body));
}
