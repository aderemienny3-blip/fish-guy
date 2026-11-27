import { formatNaira } from "@/lib/money";
import { normalizeNgPhone } from "@/lib/phone";
import { logMessage } from "@/lib/message-log";

// WhatsApp Business Cloud API (Meta). Used for (1) instant new-order alerts to you, and (2) login codes for customers.
// Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_ID on Vercel. Never throws: a failed message must never break an order.
const API = "https://graph.facebook.com/v21.0";
const LANG = () => process.env.WHATSAPP_TEMPLATE_LANG || "en";

export const whatsappConfigured = () => !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
const alertNumbers = () => (process.env.WHATSAPP_ALERT_TO ?? "").split(",").map((s) => s.replace(/\D/g, "")).filter(Boolean);
export const alertConfigured = () => whatsappConfigured() && alertNumbers().length > 0;
export const maskedAlertNumbers = () => alertNumbers().map((n) => `…${n.slice(-4)}`);

/** WhatsApp template values cannot contain new lines, tabs or long runs of spaces. */
const clean = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/ {4,}/g, "   ").trim().slice(0, 900);

export type SendResult = { to: string; ok: boolean; error?: string };

/** Sends a template message and records it in the message log. */
export async function sendTemplateMessage(to: string, name: string, bodyParams: string[], buttonParam?: string, ref?: string): Promise<SendResult> {
  const r = await sendTemplateRaw(to, name, bodyParams, buttonParam);
  await logMessage({ channel: "WHATSAPP", to, kind: name, ok: r.ok, error: r.error, ref: ref ?? null });
  return r;
}
const sendTemplate = sendTemplateMessage;

async function sendTemplateRaw(to: string, name: string, bodyParams: string[], buttonParam?: string): Promise<SendResult> {
  try {
    const components: object[] = [{ type: "body", parameters: bodyParams.map((t) => ({ type: "text", text: clean(t) })) }];
    if (buttonParam) components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: buttonParam }] });
    const res = await fetch(`${API}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "template", template: { name, language: { code: LANG() }, components } }),
      signal: AbortSignal.timeout(7000),
      cache: "no-store",
    });
    if (res.ok) return { to, ok: true };
    const j = await res.json().catch(() => ({}));
    const error = (j as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    console.error("whatsapp send failed", res.status, error);
    return { to, ok: false, error };
  } catch (e) {
    console.error("whatsapp error", e);
    return { to, ok: false, error: e instanceof Error ? e.message : "request failed" };
  }
}

/** Sends one alert line to every number in WHATSAPP_ALERT_TO. */
export async function alertOwner(text: string): Promise<SendResult[]> {
  if (!alertConfigured()) return [];
  const template = process.env.WHATSAPP_ALERT_TEMPLATE || "fish_guy_alert";
  return Promise.all(alertNumbers().map((to) => sendTemplate(to, template, [text])));
}

/** Sends a customer's login code on WhatsApp. Returns true when WhatsApp accepted it. */
export async function sendWhatsAppOtp(phone: string, code: string): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  const template = process.env.WHATSAPP_OTP_TEMPLATE || "fish_guy_login_code";
  const withButton = process.env.WHATSAPP_OTP_BUTTON !== "false"; // Meta's authentication templates include a copy-code button
  const r = await sendTemplate(phone.replace(/\D/g, ""), template, [code], withButton ? code : undefined);
  return r.ok;
}

const ORDER_LINE: Record<string, string> = {
  PAID: "Payment received. We are getting your order ready.",
  PREPARING: "We are packing your order now.",
  OUT_FOR_DELIVERY: "Your order is on its way. Please keep your phone close.",
  DELIVERED: "Delivered. Enjoy, and thank you for choosing Fish Guy.",
};

/** One status line to the customer. Template body: "Hi {{1}}, your Fish Guy order {{2}}: {{3}}". */
export async function sendOrderUpdateWhatsApp(phone: string, firstName: string, reference: string, status: string): Promise<boolean> {
  if (!whatsappConfigured()) return false;
  const line = ORDER_LINE[status];
  const to = normalizeNgPhone(phone);
  if (!line || !to) return false;
  const template = process.env.WHATSAPP_ORDER_TEMPLATE || "fish_guy_order_update";
  return (await sendTemplate(to, template, [firstName || "there", reference, line])).ok;
}

const day = (iso: string) => new Intl.DateTimeFormat("en-NG", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));

type AlertOrder = {
  reference: string;
  contactName: string;
  contactPhone: string;
  deliveryDate: string;
  totalKobo: number;
  giftName?: string | null;
  notes?: string | null;
  items: { quantity: number }[];
  zone: { name: string; isPickup?: boolean };
  slot: { label: string };
};

export function orderAlertText(o: AlertOrder) {
  const how = o.zone.isPickup ? "PICKUP" : `Delivery ${o.zone.name}`;
  const parts = [
    `NEW ORDER ${o.reference}`,
    `${o.contactName} ${o.contactPhone}`,
    `${how}, ${day(o.deliveryDate)} ${o.slot.label}`,
    `${o.items.length} item${o.items.length === 1 ? "" : "s"}`,
    formatNaira(o.totalKobo),
  ];
  if (o.giftName) parts.push(`GIFT: ${o.giftName}`);
  if (o.notes) parts.push(`Note: ${o.notes}`);
  return parts.join(" | ");
}

export const refundAlertText = (o: { reference: string; contactName: string; contactPhone: string; totalKobo: number }) =>
  `ACTION NEEDED: refund ${formatNaira(o.totalKobo)} for order ${o.reference}, ${o.contactName} ${o.contactPhone}. They paid after the items ran out`;
