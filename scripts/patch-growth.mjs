// Growth kit: checkout prefill, business order form, WhatsApp order updates, SEO basics, music refunds.
// Needs the payouts zip installed first. Safe to re-run.
import fs from "node:fs";
for (const f of ["lib/music/earnings.ts", "components/shop/checkout-client.tsx", "lib/notify.ts", "lib/whatsapp.ts"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the earlier zips first (labels, then payouts), then run this again.`); process.exit(1); }
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
  { label: "refunded status", done: "enum MusicOrderStatus {\n  PENDING\n  PAID\n  FAILED\n  REFUNDED", from: "enum MusicOrderStatus {\n  PENDING\n  PAID\n  FAILED\n}", to: "enum MusicOrderStatus {\n  PENDING\n  PAID\n  FAILED\n  REFUNDED\n}" },
  { label: "refund fields", done: "refundNote", from: "  shareWithArtist  Boolean          @default(false)\n  items            MusicOrderItem[]\n", to: "  shareWithArtist  Boolean          @default(false)\n  refundedAt       DateTime?\n  refundNote       String?\n  items            MusicOrderItem[]\n" },
  { label: "customer link", done: "regulars  RegularItem[]", from: "  createdAt DateTime @default(now())\n  orders    Order[]\n}", to: "  createdAt DateTime @default(now())\n  orders    Order[]\n  regulars  RegularItem[]\n}" },
  { label: "product link", done: "regulars    RegularItem[]", from: "  items       OrderItem[]\n\n  @@index([active, category])", to: "  items       OrderItem[]\n  regulars    RegularItem[]\n\n  @@index([active, category])" },
  {
    label: "regular list model", done: "model RegularItem {",
    from: "enum LabelStatus {",
    to: `model RegularItem {
  id         String   @id @default(cuid())
  customerId String
  productId  String
  quantity   Int
  updatedAt  DateTime @updatedAt
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([customerId, productId])
}

enum LabelStatus {`,
  },
]);

// 2. Checkout prefill
patch("app/(site)/checkout/page.tsx", [
  { label: "import", done: "getCheckoutPrefill", from: 'import { MAX_DAYS_AHEAD, addDays, lagosNow } from "@/lib/delivery";\n', to: 'import { MAX_DAYS_AHEAD, addDays, lagosNow } from "@/lib/delivery";\nimport { getCheckoutPrefill } from "@/lib/checkout-prefill";\n' },
  { label: "load", done: "const prefill = await", from: "  const today = lagosNow().date;\n", to: "  const today = lagosNow().date;\n  const prefill = await getCheckoutPrefill();\n" },
  { label: "pass", done: "prefill={prefill}", from: "          today={today}\n", to: "          today={today}\n          prefill={prefill}\n" },
]);
patch("components/shop/checkout-client.tsx", [
  { label: "import", done: 'from "@/lib/checkout-saved"', from: 'import { MAX_QTY, cartonsOf, evaluatePromo, resolveDiscounts, type PromoRules } from "@/lib/festive-math";\n', to: 'import { MAX_QTY, cartonsOf, evaluatePromo, resolveDiscounts, type PromoRules } from "@/lib/festive-math";\nimport { clearSaved, loadSaved, saveDetails, type Prefill } from "@/lib/checkout-saved";\n' },
  { label: "props", done: "promo, prefill }", from: "pickup, promo }: { zones: Zone[];", to: "pickup, promo, prefill }: { prefill?: Prefill | null; zones: Zone[];" },
  { label: "zone start", done: "prefill?.zoneId", from: 'const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");', to: 'const [zoneId, setZoneId] = useState(zones.some((z) => z.id === prefill?.zoneId) ? prefill!.zoneId : zones[0]?.id ?? "");' },
  {
    label: "saved details", done: "const [fromDevice",
    from: '  const isPickup = mode === "pickup" && !!pickup;\n',
    to: `  const isPickup = mode === "pickup" && !!pickup;
  const [pre, setPre] = useState<Prefill | null>(prefill ?? null);
  const [fromDevice, setFromDevice] = useState(false);

  // Signed-in customers get their details from the server. Guests get what this device saved last time.
  useEffect(() => {
    if (prefill) return;
    const s = loadSaved();
    if (!s) return;
    setPre(s);
    setFromDevice(true);
    if (zones.some((z) => z.id === s.zoneId)) setZoneId(s.zoneId);
  }, [prefill, zones]);
`,
  },
  { label: "form key", done: 'key={pre ? "saved" : "blank"}', from: '<form className="checkout-shell" onSubmit={onSubmit}>', to: '<form key={pre ? "saved" : "blank"} className="checkout-shell" onSubmit={onSubmit}>' },
  { label: "name field", done: 'defaultValue={pre?.name ?? ""}', from: '<input name="name" autoComplete="name" required minLength={2} />', to: '<input name="name" autoComplete="name" required minLength={2} defaultValue={pre?.name ?? ""} />' },
  { label: "phone field", done: 'defaultValue={pre?.phone ?? ""}', from: '<input name="phone" type="tel" autoComplete="tel" placeholder="080..." required />', to: '<input name="phone" type="tel" autoComplete="tel" placeholder="080..." required defaultValue={pre?.phone ?? ""} />' },
  { label: "email field", done: 'defaultValue={pre?.email ?? ""}', from: '<input name="email" type="email" autoComplete="email" required />', to: '<input name="email" type="email" autoComplete="email" required defaultValue={pre?.email ?? ""} />' },
  { label: "address field", done: 'defaultValue={pre?.addressLine ?? ""}', from: '<input name="addressLine" autoComplete="street-address" required minLength={5} />', to: '<input name="addressLine" autoComplete="street-address" required minLength={5} defaultValue={pre?.addressLine ?? ""} />' },
  { label: "landmark field", done: 'defaultValue={pre?.landmark ?? ""}', from: '<input name="landmark" />', to: '<input name="landmark" defaultValue={pre?.landmark ?? ""} />' },
  {
    label: "remember on pay", done: "saveDetails({",
    from: "      window.location.assign(json.checkoutUrl);",
    to: `      saveDetails({
        name: String(f.get("name") ?? ""), phone: String(f.get("phone") ?? ""), email: String(f.get("email") ?? ""),
        addressLine: isPickup ? pre?.addressLine ?? "" : String(f.get("addressLine") ?? ""),
        landmark: isPickup ? pre?.landmark ?? "" : String(f.get("landmark") ?? ""),
        zoneId,
      });
      window.location.assign(json.checkoutUrl);`,
  },
  {
    label: "saved note", done: "Filled in from your last order",
    from: '        {days.length === 0 && <p className="form-message is-error" role="alert">',
    to: `        {pre && (
          <p className="field-note">
            Filled in from your last order{fromDevice ? " on this device" : ""}. Check it is still right.{" "}
            {fromDevice && <button type="button" className="student-remove" onClick={() => { clearSaved(); setPre(null); setFromDevice(false); }}>Clear saved details</button>}
          </p>
        )}
        {days.length === 0 && <p className="form-message is-error" role="alert">`,
  },
  { label: "whatsapp note", done: "We send order updates by email and WhatsApp", from: '        <p className="field-note">You will be taken to Paystack', to: '        <p className="field-note">We send order updates by email and WhatsApp.</p>\n        <p className="field-note">You will be taken to Paystack' },
]);

// 3. Business order form: styles, footer link
patch("app/(site)/layout.tsx", [
  { label: "styles", done: 'import "./growth.css";', from: 'import "./mobile-player.css";\n', to: 'import "./mobile-player.css";\nimport "./growth.css";\n' },
  { label: "seo import", done: 'import { siteUrl } from "@/lib/seo";', from: 'import "./growth.css";\n', to: 'import "./growth.css";\nimport { siteUrl } from "@/lib/seo";\n' },
  {
    label: "site metadata", done: "metadataBase:",
    from: '  applicationName: "Fish Guy",\n',
    to: `  applicationName: "Fish Guy",
  metadataBase: new URL(siteUrl()),
  keywords: ["frozen fish Lagos", "frozen food delivery Lagos", "buy frozen fish online Lagos", "frozen chicken and turkey Lagos", "frozen food for restaurants Lagos", "Fish Guy"],
  openGraph: { siteName: "Fish Guy", type: "website", locale: "en_NG", title: "Fish Guy | Frozen Food Delivery in Lagos", description: "Frozen fish, turkey and chicken delivered across Lagos.", images: ["/icons/icon-512.png"] },
`,
  },
]);
patch("components/music/site-shell.tsx", [
  { label: "business link", done: 'href="/business"', from: '        <Link href="/label/login">Label sign in</Link>\n', to: '        <Link href="/business">Order for your business</Link>\n        <Link href="/label/login">Label sign in</Link>\n' },
]);

// 4. WhatsApp order updates
patch("lib/whatsapp.ts", [
  { label: "phone import", done: 'from "@/lib/phone"', from: 'import { formatNaira } from "@/lib/money";\n', to: 'import { formatNaira } from "@/lib/money";\nimport { normalizeNgPhone } from "@/lib/phone";\n' },
  {
    label: "order update sender", done: "sendOrderUpdateWhatsApp",
    from: "const day = (iso: string) =>",
    to: `const ORDER_LINE: Record<string, string> = {
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

const day = (iso: string) =>`,
  },
]);
patch("lib/notify.ts", [
  { label: "import", done: 'import { sendOrderUpdateWhatsApp }', from: 'import { formatNaira } from "@/lib/money";\n', to: 'import { formatNaira } from "@/lib/money";\nimport { sendOrderUpdateWhatsApp } from "@/lib/whatsapp";\n' },
  {
    label: "paid update", done: '"PAID").catch',
    from: "    sendEmail(adminList(), `New order ${o.reference}: ${formatNaira(o.totalKobo)}`, admin),\n  ]);",
    to: '    sendEmail(adminList(), `New order ${o.reference}: ${formatNaira(o.totalKobo)}`, admin),\n    sendOrderUpdateWhatsApp(o.contactPhone, o.contactName.split(" ")[0], o.reference, "PAID").catch(() => false),\n  ]);',
  },
  {
    label: "status signature", done: "contactEmail: string; contactPhone?: string }",
    from: "export async function notifyOrderStatus(o: { reference: string; contactName: string; contactEmail: string }, status: string) {\n  const c = STATUS_COPY[status];\n  if (!c) return;\n",
    to: 'export async function notifyOrderStatus(o: { reference: string; contactName: string; contactEmail: string; contactPhone?: string }, status: string) {\n  const c = STATUS_COPY[status];\n  if (!c) return;\n  const wa = o.contactPhone ? sendOrderUpdateWhatsApp(o.contactPhone, o.contactName.split(" ")[0], o.reference, status).catch(() => false) : Promise.resolve(false);\n',
  },
  {
    label: "status send", done: "await Promise.all([wa,",
    from: "  await sendEmail(o.contactEmail, `${c[0]} · ${o.reference}`, shell(c[0], `<p>Hi ${esc(o.contactName.split(\" \")[0])}, ${c[1]}</p>${link}`));",
    to: "  await Promise.all([wa, sendEmail(o.contactEmail, `${c[0]} · ${o.reference}`, shell(c[0], `<p>Hi ${esc(o.contactName.split(\" \")[0])}, ${c[1]}</p>${link}`))]);",
  },
]);

// 5. SEO
patch("app/(site)/page.tsx", [
  { label: "imports", done: "localBusinessJsonLd", from: 'import { getStudentRules } from "@/lib/student";\n', to: 'import { getStudentRules } from "@/lib/student";\nimport { JsonLd } from "@/components/seo/json-ld";\nimport { localBusinessJsonLd } from "@/lib/seo";\n' },
  { label: "open", done: "<><JsonLd", from: "  return <StorefrontHome ", to: "  return <><JsonLd data={localBusinessJsonLd()} /><StorefrontHome " },
  { label: "close", done: "studentPercent={student.percent} /></>;", from: "studentPercent={student.percent} />;", to: "studentPercent={student.percent} /></>;" },
]);
patch("app/(site)/shop/page.tsx", [
  { label: "metadata", done: "Buy frozen fish", from: 'export const metadata = { title: "Shop frozen food | Fish Guy" };', to: 'export const metadata = {\n  title: "Buy frozen fish, turkey and chicken in Lagos | Fish Guy",\n  description: "Order frozen fish, turkey and chicken online and get cold delivery across Lagos. Pay securely with Paystack.",\n  alternates: { canonical: "/shop" },\n};' },
]);
patch("app/(site)/shop/[productSlug]/page.tsx", [
  { label: "imports", done: "productJsonLd", from: 'import { naira } from "@/lib/shop/format";\n', to: 'import { naira } from "@/lib/shop/format";\nimport { JsonLd } from "@/components/seo/json-ld";\nimport { productJsonLd } from "@/lib/seo";\n' },
  { label: "page metadata", done: "alternates: { canonical", from: "per ${p.unit}. Frozen food delivery in Lagos.` }", to: "per ${p.unit}. Frozen food delivery in Lagos.`, alternates: { canonical: `/shop/${p.slug}` }, openGraph: { title: p.name, images: p.imageUrl ? [p.imageUrl] : undefined } }" },
  { label: "structured data", done: "<JsonLd data={productJsonLd", from: '    <main className="page-width product-page">\n', to: '    <main className="page-width product-page">\n      <JsonLd data={productJsonLd(p)} />\n' },
]);

// 6. Music refunds
patch("app/admin/(panel)/layout.tsx", [
  { label: "menu", done: "/admin/music/orders", from: '  { href: "/admin/music/payouts", label: "Payouts and splits", roles: MGR },\n', to: '  { href: "/admin/music/payouts", label: "Payouts and splits", roles: MGR },\n  { href: "/admin/music/orders", label: "Music orders and refunds", roles: MGR },\n' },
]);

console.log(problems ? `\n${problems} step(s) were skipped. Send me the SKIP lines.` : "\nAll done.");
