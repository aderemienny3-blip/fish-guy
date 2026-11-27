// Checkout and messages kit: delivery fee and free-delivery bar, payment countdown, consent and opt-out,
// unpaid-order and reorder reminders, message log, WhatsApp broadcasts, privacy update.
// Needs the tracking zip installed first. Safe to re-run.
import fs from "node:fs";
for (const f of ["lib/attribution.ts", "lib/meta-capi.ts", "lib/bundle-math.ts", "lib/whatsapp.ts"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the earlier zips first (growth, trust, tracking), then run this again.`); process.exit(1); }
}
let problems = 0;
function patch(file, steps) {
  if (!fs.existsSync(file)) { console.log(`SKIP ${file} (not found)`); problems++; return; }
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let src = raw.replace(/\r\n/g, "\n");
  let changed = false;
  for (const { label, done, from, to } of steps) {
    if (src.includes(done)) { console.log(`ok   ${file}: ${label} (already done)`); continue; }
    if (!src.includes(from)) { console.log(`SKIP ${file}: ${label} (anchor not found)`); problems++; continue; }
    src = src.replace(from, () => to); changed = true; console.log(`done ${file}: ${label}`);
  }
  if (changed) fs.writeFileSync(file, crlf ? src.replace(/\n/g, "\r\n") : src);
}

// 1. Database
patch("prisma/schema.prisma", [
  { label: "payment link", done: "  raw         Json?\n  checkoutUrl String?\n", from: "  method      String?\n  raw         Json?\n", to: "  method      String?\n  raw         Json?\n  checkoutUrl String?\n" },
  { label: "reminder marks", done: "reminder1At            DateTime?", from: "  trackIp               String?\n".replace("trackIp               ", "trackIp                "), to: "  trackIp                String?\n  reminder1At            DateTime?\n  reminder2At            DateTime?\n" },
  {
    label: "new models", done: "model MessagingConsent {",
    from: "model FunnelEvent {",
    to: `model MessagingConsent {
  phone         String    @id
  marketing     Boolean   @default(false)
  source        String    @default("checkout")
  consentedAt   DateTime  @default(now())
  optedOutAt    DateTime?
  lastReorderAt DateTime?
  updatedAt     DateTime  @updatedAt
}

model MessageLog {
  id        String   @id @default(cuid())
  channel   String
  to        String
  kind      String
  ref       String?
  ok        Boolean
  error     String?
  createdAt DateTime @default(now())

  @@index([createdAt])
  @@index([kind, createdAt])
}

model FunnelEvent {`,
  },
]);

// 2. Checkout: consent, payment link
patch("app/api/checkout/route.ts", [
  { label: "consent field", done: "marketingConsent: z.boolean()", from: "  studentRef: z.string().optional(),\n});", to: "  studentRef: z.string().optional(),\n  marketingConsent: z.boolean().optional(),\n});" },
  { label: "keep payment link", done: "        checkoutUrl: init.authorizationUrl,\n", from: "        providerRef: init.reference,\n        amountKobo: order.totalKobo,\n", to: "        providerRef: init.reference,\n        amountKobo: order.totalKobo,\n        checkoutUrl: init.authorizationUrl,\n" },
  {
    label: "record consent", done: "if (b.marketingConsent) {",
    from: "    return NextResponse.json({ checkoutUrl: init.authorizationUrl, reference: order.reference });",
    to: `    // Offers and reminders only if the customer ticked the box. Order messages do not need it.
    if (b.marketingConsent) {
      await db.messagingConsent
        .upsert({ where: { phone: order.contactPhone }, update: { marketing: true, source: "checkout", consentedAt: new Date(), optedOutAt: null }, create: { phone: order.contactPhone, marketing: true, source: "checkout" } })
        .catch((e) => console.error("consent not saved", e));
    }

    return NextResponse.json({ checkoutUrl: init.authorizationUrl, reference: order.reference });`,
  },
]);
patch("components/shop/checkout-client.tsx", [
  { label: "send consent", done: 'marketingConsent: f.get("marketing") === "on"', from: "          studentRef: studentRef ?? undefined,\n        }),", to: '          studentRef: studentRef ?? undefined,\n          marketingConsent: f.get("marketing") === "on",\n        }),' },
  {
    label: "consent box", done: "consent-row",
    from: '        <p className="field-note">We send order updates by email and WhatsApp.</p>\n',
    to: '        <label className="consent-row"><input type="checkbox" name="marketing" /><span>Send me offers and reorder reminders on WhatsApp and email. Optional. You can stop any time.</span></label>\n        <p className="field-note">We always send updates about your order by email and WhatsApp.</p>\n',
  },
  {
    label: "remember area", done: "fish-guy-zone-v1",
    from: "  const [fromDevice, setFromDevice] = useState(false);\n",
    to: `  const [fromDevice, setFromDevice] = useState(false);

  // The area picked in the cart carries over to checkout.
  useEffect(() => {
    if (prefill?.zoneId) return;
    try { const z = window.localStorage.getItem("fish-guy-zone-v1"); if (z && zones.some((x) => x.id === z)) setZoneId(z); } catch { /* ignore */ }
  }, [prefill, zones]);
`,
  },
]);

// 3. Delivery fee in the cart and on the shop page
patch("components/shop/cart-drawer.tsx", [
  { label: "import", done: "DeliveryEstimate", from: 'import { WhatsAppLink } from "@/components/shop/whatsapp-chat";\n', to: 'import { WhatsAppLink } from "@/components/shop/whatsapp-chat";\nimport { DeliveryEstimate } from "@/components/shop/delivery-estimate";\n' },
  { label: "show", done: "<DeliveryEstimate />", from: "          {lines.length > 0 && <PromoProgress />}\n", to: "          {lines.length > 0 && <PromoProgress />}\n\n          {lines.length > 0 && <DeliveryEstimate />}\n" },
]);
patch("app/(site)/shop/page.tsx", [
  { label: "import", done: "DeliveryNote", from: 'import { BundleShelf } from "@/components/shop/bundle-shelf";\n', to: 'import { BundleShelf } from "@/components/shop/bundle-shelf";\nimport { DeliveryNote } from "@/components/shop/delivery-note";\n' },
  { label: "show", done: "<DeliveryNote />", from: "      {!selected && <BundleShelf />}\n", to: "      <DeliveryNote />\n      {!selected && <BundleShelf />}\n" },
]);

// 4. Payment countdown
patch("app/(site)/order/[reference]/page.tsx", [
  { label: "import", done: "PaymentCountdown", from: 'import { PurchaseEvent } from "@/components/track/pixel-event";\n', to: 'import { PurchaseEvent } from "@/components/track/pixel-event";\nimport { PaymentCountdown } from "@/components/shop/payment-countdown";\n' },
  { label: "load payment link", done: "payments: { orderBy", from: "include: { items: true, zone: true, slot: true } });", to: 'include: { items: true, zone: true, slot: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } } });' },
  {
    label: "countdown", done: "<PaymentCountdown",
    from: '      {order.status === "PENDING_PAYMENT" && (\n        <p className="utility-intro">We have not received your payment yet. If you already paid, this page updates within a minute. Refresh to check again.</p>\n      )}',
    to: '      {order.status === "PENDING_PAYMENT" && (\n        <PaymentCountdown expiresAt={order.expiresAt ? order.expiresAt.toISOString() : null} payUrl={order.payments[0]?.checkoutUrl ?? null} />\n      )}',
  },
]);

// 5. Message log
patch("lib/notify.ts", [
  { label: "import", done: 'from "@/lib/message-log"', from: 'import { sendOrderUpdateWhatsApp } from "@/lib/whatsapp";\n', to: 'import { sendOrderUpdateWhatsApp } from "@/lib/whatsapp";\nimport { logMessage } from "@/lib/message-log";\n' },
  { label: "log skipped", done: 'error: "Email is not set up"', from: '    console.warn("email skipped (no RESEND_API_KEY or recipient):", subject);\n    return false;', to: '    console.warn("email skipped (no RESEND_API_KEY or recipient):", subject);\n    if (list.length > 0) await logMessage({ channel: "EMAIL", to: list.join(", "), kind: subject, ok: false, error: "Email is not set up" });\n    return false;' },
  { label: "log result", done: "kind: subject, ok: res.ok", from: '    if (!res.ok) console.error("email failed", res.status, await res.text().catch(() => ""));\n    return res.ok;', to: '    if (!res.ok) console.error("email failed", res.status, await res.text().catch(() => ""));\n    await logMessage({ channel: "EMAIL", to: list.join(", "), kind: subject, ok: res.ok, error: res.ok ? null : `HTTP ${res.status}` });\n    return res.ok;' },
  { label: "log error", done: 'error: "request failed"', from: '    console.error("email error", e);\n    return false;', to: '    console.error("email error", e);\n    await logMessage({ channel: "EMAIL", to: list.join(", "), kind: subject, ok: false, error: "request failed" });\n    return false;' },
]);
patch("lib/whatsapp.ts", [
  { label: "import", done: 'from "@/lib/message-log"', from: 'import { normalizeNgPhone } from "@/lib/phone";\n', to: 'import { normalizeNgPhone } from "@/lib/phone";\nimport { logMessage } from "@/lib/message-log";\n' },
  {
    label: "log every template message", done: "sendTemplateMessage",
    from: "async function sendTemplate(to: string, name: string, bodyParams: string[], buttonParam?: string): Promise<SendResult> {",
    to: `/** Sends a template message and records it in the message log. */
export async function sendTemplateMessage(to: string, name: string, bodyParams: string[], buttonParam?: string, ref?: string): Promise<SendResult> {
  const r = await sendTemplateRaw(to, name, bodyParams, buttonParam);
  await logMessage({ channel: "WHATSAPP", to, kind: name, ok: r.ok, error: r.error, ref: ref ?? null });
  return r;
}
const sendTemplate = sendTemplateMessage;

async function sendTemplateRaw(to: string, name: string, bodyParams: string[], buttonParam?: string): Promise<SendResult> {`,
  },
]);

// 6. Customer list and CSV: consent, area, what they buy
patch("app/admin/(panel)/customers/page.tsx", [
  { label: "imports", done: 'from "@/lib/admin/orders"', from: 'import { formatNaira } from "@/lib/money";\n', to: 'import { formatNaira } from "@/lib/money";\nimport { db } from "@/lib/db";\nimport { PAID_STATUSES } from "@/lib/admin/orders";\n' },
  {
    label: "load details", done: "const optedIn",
    from: '  const exportHref = seg ? `/admin/customers/export?segment=${seg}` : "/admin/customers/export";\n',
    to: `  const exportHref = seg ? \`/admin/customers/export?segment=\${seg}\` : "/admin/customers/export";

  const shown = rows.map((c) => c.phone);
  const [consents, history] = await Promise.all([
    db.messagingConsent.findMany({ where: { phone: { in: shown } }, select: { phone: true, marketing: true } }),
    db.order.findMany({ where: { contactPhone: { in: shown }, status: { in: PAID_STATUSES } }, orderBy: { createdAt: "desc" }, take: 4000, select: { contactPhone: true, zone: { select: { name: true } }, items: { select: { nameSnapshot: true, quantity: true } } } }),
  ]);
  const optedIn = new Map(consents.map((c) => [c.phone, c.marketing]));
  const area = new Map<string, string>();
  const bought = new Map<string, Map<string, number>>();
  for (const o of history) {
    if (!area.has(o.contactPhone)) area.set(o.contactPhone, o.zone.name);
    const m = bought.get(o.contactPhone) ?? new Map<string, number>();
    for (const i of o.items) m.set(i.nameSnapshot, (m.get(i.nameSnapshot) ?? 0) + i.quantity);
    bought.set(o.contactPhone, m);
  }
  const usually = (phone: string) => [...(bought.get(phone) ?? [])].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n).join(", ");
`,
  },
  { label: "width", done: "min-w-[1100px]", from: "min-w-[820px]", to: "min-w-[1100px]" },
  { label: "headings", done: "<th className={th}>Area</th>", from: "                <th className={`${th} text-right`}>Last order</th>", to: "                <th className={th}>Area</th>\n                <th className={th}>Usually buys</th>\n                <th className={th}>Offers</th>\n                <th className={`${th} text-right`}>Last order</th>" },
  { label: "cells", done: 'optedIn.get(c.phone) ?', from: "                    <td className={`${td} text-right text-[#9A9585]`}>{ago === 0", to: '                    <td className={td}>{area.get(c.phone) ?? "-"}</td>\n                    <td className={`${td} text-xs`}>{usually(c.phone) || "-"}</td>\n                    <td className={td}>{optedIn.get(c.phone) ? <span className="text-[#D4AF37]">Agreed</span> : optedIn.get(c.phone) === false ? <span className="text-red-300">Stopped</span> : <span className="text-[#9A9585]">No</span>}</td>\n                    <td className={`${td} text-right text-[#9A9585]`}>{ago === 0' },
]);
patch("app/admin/(panel)/customers/export/route.ts", [
  { label: "import", done: 'import { db }', from: 'import { getAdmin } from "@/lib/admin/auth";\n', to: 'import { getAdmin } from "@/lib/admin/auth";\nimport { db } from "@/lib/db";\n' },
  { label: "load consent", done: "const consented", from: "  const header = [", to: '  const consented = new Set((await db.messagingConsent.findMany({ where: { marketing: true }, select: { phone: true } })).map((x) => x.phone));\n  const header = [' },
  { label: "column heading", done: "\"Agreed to offers\"", from: '"First order", "Last order"];', to: '"First order", "Last order", "Agreed to offers"];' },
  { label: "column value", done: 'consented.has(c.phone) ?', from: "        c.lastAt.toISOString().slice(0, 10),\n      ]", to: '        c.lastAt.toISOString().slice(0, 10),\n        consented.has(c.phone) ? "Yes" : "No",\n      ]' },
]);

// 7. Styles, admin menu
patch("app/(site)/layout.tsx", [
  { label: "styles", done: 'import "./messages.css";', from: 'import "./track.css";\n', to: 'import "./track.css";\nimport "./messages.css";\n' },
]);
patch("app/admin/(panel)/layout.tsx", [
  { label: "menu", done: "/admin/broadcast", from: '  { href: "/admin/links", label: "Tracked links", roles: MGR },\n', to: '  { href: "/admin/links", label: "Tracked links", roles: MGR },\n  { href: "/admin/messages", label: "Message log", roles: MGR },\n  { href: "/admin/broadcast", label: "WhatsApp offers", roles: MGR },\n' },
]);

// 8. Privacy policy and terms
patch("app/(site)/privacy/page.tsx", [
  { label: "providers", done: "Meta for WhatsApp messages", from: "Paystack for payments, Vercel for hosting, and an email service for order messages.", to: "Paystack for payments, Vercel for hosting, an email service for order messages, and Meta for WhatsApp messages and, if you allow it, ad measurement." },
  {
    label: "new sections", done: 'title="Ads and tracking"',
    from: '      <Section title="Your rights">',
    to: `      <Section title="Ads and tracking">
        <p>If you tap Allow on our ad-measurement banner, we use the Meta Pixel and Meta&apos;s Conversions API. Meta receives which pages you viewed, what you added to your cart, when you started checkout and what you bought, with its value. For purchases it also receives your email and phone number in scrambled (hashed) form, your browser details and your approximate internet address, so ads can be measured and matched. If you do not tap Allow, none of the Meta tools load and none of this is sent.</p>
        <p>Separately, we keep a small cookie for 30 days that remembers which link, ad or site sent you here, and an anonymous visit number that lets us count how many visitors add to cart and check out. They do not contain your name, phone or email. Clearing this site&apos;s cookies and storage in your browser removes them and the banner will ask you again.</p>
      </Section>
      <Section title="Messages and reminders">
        <p>We send messages about your order by WhatsApp and email: payment received, being packed, out for delivery, delivered, and a reminder if payment is still waiting. These are part of your order. We send offers and reorder reminders only if you tick the box at checkout. You can stop them at any time by replying STOP on WhatsApp or using the stop link in our emails. Stopping offers does not stop order messages.</p>
        <p>We keep a record of the messages we send (who, when, what kind and whether it was delivered) to help with support and to show what was sent. The text of the message is not kept in that record.</p>
      </Section>
      <Section title="Your rights">`,
  },
]);
patch("app/(site)/terms/page.tsx", [
  { label: "messages clause", done: 'title="Messages"', from: '      <Section title="Using the site">', to: '      <Section title="Messages">\n        <p>When you order, you agree that we send you messages about that order by WhatsApp and email. Offers and reorder reminders are sent only if you agree to them at checkout, and you can stop them at any time.</p>\n      </Section>\n      <Section title="Using the site">' },
]);

console.log(problems ? `\n${problems} step(s) were skipped. Send me the SKIP lines.` : "\nAll done.");
