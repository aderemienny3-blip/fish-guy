// Trust kit: verified reviews, bundle deals, WhatsApp chat buttons.
// Needs the growth zip installed first. Safe to re-run.
import fs from "node:fs";
for (const f of ["lib/seo.ts", "lib/whatsapp.ts", "app/(site)/business/page.tsx", "components/shop/checkout-client.tsx"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the growth zip first, then run this again.`); process.exit(1); }
}
if (!fs.readFileSync("prisma/schema.prisma", "utf8").includes("model RegularItem")) { console.log("Stop: the growth zip is not fully installed (RegularItem is missing). Run patch-growth.mjs first."); process.exit(1); }
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
  { label: "product links", done: "bundleItems BundleItem[]", from: "  regulars    RegularItem[]\n", to: "  regulars    RegularItem[]\n  bundleItems BundleItem[]\n  reviews     Review[]\n" },
  { label: "order links", done: "payments Payment[]\n  reviews  Review[]", from: "  items    OrderItem[]\n  payments Payment[]\n", to: "  items    OrderItem[]\n  payments Payment[]\n  reviews  Review[]\n" },
  { label: "order bundle saving", done: "bundleDiscountKobo", from: "  promoDiscountKobo      Int                  @default(0)\n", to: "  promoDiscountKobo      Int                  @default(0)\n  bundleDiscountKobo     Int                  @default(0)\n" },
  {
    label: "new models", done: "model Bundle {",
    from: "enum LabelStatus {",
    to: `enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
}

model Bundle {
  id          String       @id @default(cuid())
  slug        String       @unique
  name        String
  description String?
  priceKobo   Int
  active      Boolean      @default(true)
  createdAt   DateTime     @default(now())
  items       BundleItem[]
}

model BundleItem {
  id        String  @id @default(cuid())
  bundleId  String
  productId String
  quantity  Int
  bundle    Bundle  @relation(fields: [bundleId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([bundleId, productId])
}

model Review {
  id          String       @id @default(cuid())
  productId   String
  orderId     String
  rating      Int
  comment     String?
  displayName String
  status      ReviewStatus @default(PENDING)
  createdAt   DateTime     @default(now())
  moderatedAt DateTime?
  product     Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  order       Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@unique([orderId, productId])
  @@index([productId, status])
}

enum LabelStatus {`,
  },
]);

// 2. Bundle deals at checkout (server)
patch("app/api/checkout/route.ts", [
  { label: "import", done: 'from "@/lib/bundle-math"', from: 'import { MAX_QTY, cartonsOf, evaluatePromo, resolveDiscounts } from "@/lib/festive-math";\n', to: 'import { MAX_QTY, cartonsOf, evaluatePromo, resolveDiscounts } from "@/lib/festive-math";\nimport { applyBundles } from "@/lib/bundle-math";\n' },
  {
    label: "work out the bundle saving", done: "const bundleKobo",
    from: "      const studentRaw = studentVerificationId ? discountFor(subtotal, studentPercent, studentMax) : 0;",
    to: `      // Bundle deals: found from the cart contents and priced from the database. The student discount applies to what is left.
      const bundleRows = await tx.bundle.findMany({ where: { active: true }, include: { items: true } });
      const bundleDeal = applyBundles(
        bundleRows.map((b) => ({ id: b.id, name: b.name, priceKobo: b.priceKobo, items: b.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) })),
        qtyById,
        new Map(products.map((p) => [p.id, p.priceKobo])),
      );
      const bundleKobo = Math.min(bundleDeal.savingKobo, subtotal);
      const studentRaw = studentVerificationId ? discountFor(subtotal - bundleKobo, studentPercent, studentMax) : 0;`,
  },
  { label: "discount clamp", done: "subtotalKobo: subtotal - bundleKobo,", from: "        subtotalKobo: subtotal,\n        promoKobo: deal?.discountKobo ?? 0,", to: "        subtotalKobo: subtotal - bundleKobo,\n        promoKobo: deal?.discountKobo ?? 0," },
  { label: "save on order", done: "bundleDiscountKobo: bundleKobo", from: "          promoDiscountKobo: promoKobo,\n", to: "          promoDiscountKobo: promoKobo,\n          bundleDiscountKobo: bundleKobo,\n" },
  { label: "total", done: "- bundleKobo + deliveryFee", from: "totalKobo: subtotal - discount - promoKobo + deliveryFee,", to: "totalKobo: subtotal - discount - promoKobo - bundleKobo + deliveryFee," },
]);

// 3. Bundle deals at checkout (screen)
patch("app/(site)/checkout/page.tsx", [
  { label: "import", done: "getBundleDefs", from: 'import { getCheckoutPrefill } from "@/lib/checkout-prefill";\n', to: 'import { getCheckoutPrefill } from "@/lib/checkout-prefill";\nimport { getBundleDefs } from "@/lib/bundles";\n' },
  { label: "load", done: "const bundles = await", from: "  const prefill = await getCheckoutPrefill();\n", to: "  const prefill = await getCheckoutPrefill();\n  const bundles = await getBundleDefs();\n" },
  { label: "pass", done: "bundles={bundles}", from: "          prefill={prefill}\n", to: "          prefill={prefill}\n          bundles={bundles}\n" },
]);
patch("components/shop/checkout-client.tsx", [
  { label: "imports", done: 'from "@/lib/bundle-math"', from: 'import { clearSaved, loadSaved, saveDetails, type Prefill } from "@/lib/checkout-saved";\n', to: 'import { clearSaved, loadSaved, saveDetails, type Prefill } from "@/lib/checkout-saved";\nimport { applyBundles, type BundleDef } from "@/lib/bundle-math";\nimport { WhatsAppLink } from "@/components/shop/whatsapp-chat";\n' },
  { label: "props", done: "prefill, bundles }", from: "promo, prefill }: { prefill?: Prefill | null;", to: "promo, prefill, bundles }: { bundles?: BundleDef[]; prefill?: Prefill | null;" },
  {
    label: "bundle saving", done: "const bundleKobo",
    from: "  const cartonLines = items.map((i) => ({ qty: i.quantity, cartonKg: i.cartonKg }));\n",
    to: `  const cartonLines = items.map((i) => ({ qty: i.quantity, cartonKg: i.cartonKg }));
  const bundle = applyBundles(bundles ?? [], new Map(items.map((i) => [i.productId, i.quantity])), new Map(items.map((i) => [i.productId, i.priceKobo])));
  const bundleKobo = Math.min(bundle.savingKobo, subtotalKobo);
`,
  },
  {
    label: "discounts on what is left", done: "subtotalKobo: subtotalKobo - bundleKobo,",
    from: "    subtotalKobo,\n    promoKobo: deal?.discountKobo ?? 0,\n    studentKobo: studentRef ? discountFor(subtotalKobo, student.percent, student.maxKobo) : 0,",
    to: "    subtotalKobo: subtotalKobo - bundleKobo,\n    promoKobo: deal?.discountKobo ?? 0,\n    studentKobo: studentRef ? discountFor(subtotalKobo - bundleKobo, student.percent, student.maxKobo) : 0,",
  },
  { label: "total", done: "- promoKobo - bundleKobo + fee", from: "const total = subtotalKobo - discount - promoKobo + fee;", to: "const total = subtotalKobo - discount - promoKobo - bundleKobo + fee;" },
  {
    label: "summary row", done: "Bundle deal (",
    from: '          {promoKobo > 0 && <div className="summary-discount"><dt>{promo?.title ?? "Festive deal"}</dt>',
    to: '          {bundleKobo > 0 && <div className="summary-discount"><dt>Bundle deal ({bundle.applied.map((a) => (a.count > 1 ? `${a.count} × ` : "") + a.name).join(", ")})</dt><dd>-{naira(bundleKobo)}</dd></div>}\n          {promoKobo > 0 && <div className="summary-discount"><dt>{promo?.title ?? "Festive deal"}</dt>',
  },
  { label: "whatsapp help", done: "Need help? Chat on WhatsApp", from: '        <p className="field-note">You will be taken to Paystack to pay by card, bank transfer or USSD.</p>\n', to: '        <p className="field-note">You will be taken to Paystack to pay by card, bank transfer or USSD.</p>\n        <WhatsAppLink text="Hello Fish Guy, I need help with my order." label="Need help? Chat on WhatsApp" />\n' },
]);

// 4. Bundle shelf on the home page and shop page
patch("components/shop/storefront-home.tsx", [
  { label: "import", done: 'import type { ReactNode } from "react";', from: 'import type { LucideIcon } from "lucide-react";\n', to: 'import type { LucideIcon } from "lucide-react";\nimport type { ReactNode } from "react";\n' },
  { label: "prop", done: "bundles = null,", from: "  studentPercent = 0,\n}: {", to: "  studentPercent = 0,\n  bundles = null,\n}: {" },
  { label: "prop type", done: "bundles?: ReactNode;", from: "  studentPercent?: number;\n}) {", to: "  studentPercent?: number;\n  bundles?: ReactNode;\n}) {" },
  { label: "place", done: "      {bundles}\n", from: '      <section className="shop-section product-section" id="products"', to: '      {bundles}\n\n      <section className="shop-section product-section" id="products"' },
]);
patch("app/(site)/page.tsx", [
  { label: "import", done: 'import { BundleShelf }', from: 'import { localBusinessJsonLd } from "@/lib/seo";\n', to: 'import { localBusinessJsonLd } from "@/lib/seo";\nimport { BundleShelf } from "@/components/shop/bundle-shelf";\n' },
  { label: "pass", done: "bundles={<BundleShelf />}", from: "studentPercent={student.percent} /></>;", to: "studentPercent={student.percent} bundles={<BundleShelf />} /></>;" },
]);
patch("app/(site)/shop/page.tsx", [
  { label: "import", done: 'import { BundleShelf }', from: 'import { getShopData } from "@/lib/shop/data";\n', to: 'import { getShopData } from "@/lib/shop/data";\nimport { BundleShelf } from "@/components/shop/bundle-shelf";\n' },
  { label: "place", done: "{!selected && <BundleShelf />}", from: "      {(categories.length > 0 || addOns.length > 0) && (\n", to: "      {!selected && <BundleShelf />}\n      {(categories.length > 0 || addOns.length > 0) && (\n" },
]);

// 5. WhatsApp chat buttons
patch("app/(site)/layout.tsx", [
  { label: "imports", done: 'import "./trust.css";', from: 'import { siteUrl } from "@/lib/seo";\n', to: 'import { siteUrl } from "@/lib/seo";\nimport "./trust.css";\nimport { WhatsAppFloat } from "@/components/shop/whatsapp-chat";\n' },
  { label: "floating button", done: "<WhatsAppFloat />", from: "          <MiniPlayer />\n", to: "          <MiniPlayer />\n          <WhatsAppFloat />\n" },
]);
patch("components/shop/cart-drawer.tsx", [
  { label: "import", done: "whatsapp-chat", from: 'import { CartAddOns } from "@/components/shop/addon-shelf";\n', to: 'import { CartAddOns } from "@/components/shop/addon-shelf";\nimport { WhatsAppLink } from "@/components/shop/whatsapp-chat";\n' },
  { label: "link", done: "Questions? Chat on WhatsApp", from: "            <p>Delivery fee and time slot are chosen at checkout.</p>\n", to: "            <p>Delivery fee and time slot are chosen at checkout.</p>\n            <WhatsAppLink text=\"Hello Fish Guy, I have a question about my cart.\" label=\"Questions? Chat on WhatsApp\" />\n" },
]);

// 6. Product page: WhatsApp, reviews, rating in search results
patch("lib/seo.ts", [
  { label: "rating input", done: "rating?: { count: number; avg: number }", from: "stockQty: number }) {", to: "stockQty: number }, rating?: { count: number; avg: number }) {" },
  { label: "rating data", done: "aggregateRating", from: '    brand: { "@type": "Brand", name: BUSINESS.name },\n', to: '    brand: { "@type": "Brand", name: BUSINESS.name },\n    aggregateRating: rating && rating.count > 0 ? { "@type": "AggregateRating", ratingValue: rating.avg, reviewCount: rating.count } : "",\n' },
]);
patch("app/(site)/shop/[productSlug]/page.tsx", [
  { label: "imports", done: "ReviewsSection", from: 'import { productJsonLd } from "@/lib/seo";\n', to: 'import { productJsonLd } from "@/lib/seo";\nimport { ReviewsSection } from "@/components/shop/reviews-section";\nimport { WhatsAppLink } from "@/components/shop/whatsapp-chat";\nimport { getReviewSummary } from "@/lib/reviews";\n' },
  { label: "load rating", done: "getReviewSummary(p.id)", from: "  const low = stockLabel(p);\n", to: "  const rating = await getReviewSummary(p.id);\n  const low = stockLabel(p);\n" },
  { label: "rating in data", done: "productJsonLd(p, rating)", from: "productJsonLd(p)", to: "productJsonLd(p, rating)" },
  { label: "whatsapp", done: "Ask about this on WhatsApp", from: '          {p.cartonKg && p.unit === "kg" && <CartonButton product={p} cartonKg={p.cartonKg} />}\n', to: '          {p.cartonKg && p.unit === "kg" && <CartonButton product={p} cartonKg={p.cartonKg} />}\n          <WhatsAppLink text={`Hello Fish Guy, I have a question about ${p.name}.`} label="Ask about this on WhatsApp" />\n' },
  { label: "reviews", done: "<ReviewsSection", from: '      <AddOnShelf items={addOns} title="Goes well with this"', to: '      <ReviewsSection productId={p.id} />\n      <AddOnShelf items={addOns} title="Goes well with this"' },
]);

// 7. Order page, delivered email, admin menu
patch("app/(site)/order/[reference]/page.tsx", [
  { label: "bundle row", done: "Bundle deal</dt>", from: "          {order.promoDiscountKobo > 0 &&", to: '          {order.bundleDiscountKobo > 0 && <div className="summary-discount"><dt>Bundle deal</dt><dd>-{naira(order.bundleDiscountKobo)}</dd></div>}\n          {order.promoDiscountKobo > 0 &&' },
  { label: "rate button", done: "Rate your order", from: '        <Link href="/shop" className="button button-outline">Continue shopping</Link>\n', to: '        {order.status === "DELIVERED" && <Link href={`/review/${order.reference}`} className="button button-gold">Rate your order</Link>}\n        <Link href="/shop" className="button button-outline">Continue shopping</Link>\n' },
]);
patch("lib/notify.ts", [
  { label: "rate link", done: "const rate =", from: "  await Promise.all([wa, sendEmail(", to: '  const rate = status === "DELIVERED" && site() ? `<p style="margin:12px 0 0"><a href="${site()}/review/${o.reference}" style="color:#D4AF37">Rate your order</a></p>` : "";\n  await Promise.all([wa, sendEmail(' },
  { label: "rate in email", done: "${link}${rate}", from: "${c[1]}</p>${link}`", to: "${c[1]}</p>${link}${rate}`" },
]);
patch("app/admin/(panel)/layout.tsx", [
  { label: "menu", done: "/admin/bundles", from: '  { href: "/admin/music", label: "Music", roles: MGR },\n', to: '  { href: "/admin/bundles", label: "Bundles", roles: MGR },\n  { href: "/admin/reviews", label: "Reviews", roles: MGR },\n  { href: "/admin/music", label: "Music", roles: MGR },\n' },
]);

console.log(problems ? `\n${problems} step(s) were skipped. Send me the SKIP lines.` : "\nAll done.");
