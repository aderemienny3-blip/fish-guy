// Tracking kit: Meta Pixel with consent, server-side purchase events, order sources, tracked links, funnel report.
// Needs the trust zip installed first. Safe to re-run.
import fs from "node:fs";
for (const f of ["lib/bundle-math.ts", "lib/seo.ts", "components/shop/whatsapp-chat.tsx", "lib/payments.ts"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the growth and trust zips first, then run this again.`); process.exit(1); }
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
  {
    label: "order sources", done: "trackingConsent",
    from: "  bundleDiscountKobo     Int                  @default(0)\n",
    to: "  bundleDiscountKobo     Int                  @default(0)\n  utmSource              String?\n  utmMedium              String?\n  utmCampaign            String?\n  utmContent             String?\n  refCode                String?\n  trackingConsent        Boolean              @default(false)\n  fbp                    String?\n  fbc                    String?\n  trackUa                String?\n  trackIp                String?\n",
  },
  { label: "music order sources", done: "  utmCampaign      String?", from: "  refundNote       String?\n", to: "  refundNote       String?\n  utmSource        String?\n  utmCampaign      String?\n  refCode          String?\n" },
  {
    label: "new models", done: "model FunnelEvent {",
    from: "enum ReviewStatus {",
    to: `model FunnelEvent {
  id        String   @id @default(cuid())
  sid       String
  type      String
  day       String
  source    String
  campaign  String?
  ref       String?
  createdAt DateTime @default(now())

  @@unique([sid, type, day])
  @@index([day, source])
  @@index([ref])
}

model TrackedLink {
  id          String   @id @default(cuid())
  code        String   @unique
  label       String
  kind        String
  destination String
  artistId    String?
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
}

model LinkClick {
  id        String   @id @default(cuid())
  code      String
  createdAt DateTime @default(now())

  @@index([code, createdAt])
}

enum ReviewStatus {`,
  },
]);

// 2. Save the source on every order
patch("app/api/checkout/route.ts", [
  { label: "import", done: 'from "@/lib/attribution"', from: 'import { applyBundles } from "@/lib/bundle-math";\n', to: 'import { applyBundles } from "@/lib/bundle-math";\nimport { orderAttribution } from "@/lib/attribution";\n' },
  { label: "read", done: "const attribution =", from: "  const b = parsed.data;\n", to: "  const b = parsed.data;\n  const attribution = orderAttribution(req.headers);\n" },
  { label: "save", done: "...attribution,", from: "          bundleDiscountKobo: bundleKobo,\n", to: "          bundleDiscountKobo: bundleKobo,\n          ...attribution,\n" },
]);
patch("app/api/music/checkout/route.ts", [
  { label: "import", done: 'from "@/lib/attribution"', from: "import { randomUUID }", to: 'import { musicAttribution } from "@/lib/attribution";\nimport { randomUUID }' },
  { label: "save", done: "...musicAttribution(", from: "        ...geoFrom(request.headers),\n", to: "        ...geoFrom(request.headers),\n        ...musicAttribution(request.headers),\n" },
]);

// 3. Server-side purchase event
patch("lib/payments.ts", [
  { label: "import", done: 'from "@/lib/meta-capi"', from: 'import { notifyNeedsRefund, notifyOrderPaid } from "@/lib/notify";\n', to: 'import { notifyNeedsRefund, notifyOrderPaid } from "@/lib/notify";\nimport { sendPurchaseEvent } from "@/lib/meta-capi";\n' },
  { label: "send", done: "sendPurchaseEvent(full)", from: "          await notifyOrderPaid(full);\n", to: "          await notifyOrderPaid(full);\n          await sendPurchaseEvent(full);\n" },
]);

// 4. Browser side: pixel, consent, source cookie, funnel steps
patch("app/(site)/layout.tsx", [
  {
    label: "imports", done: 'import "./track.css";',
    from: 'import "./trust.css";\n',
    to: 'import "./trust.css";\nimport "./track.css";\nimport { SourceCapture } from "@/components/track/source-capture";\nimport { MetaPixel } from "@/components/track/meta-pixel";\nimport { ConsentBanner } from "@/components/track/consent-banner";\n',
  },
  { label: "mount", done: "<SourceCapture />", from: "          <PwaBoot />\n", to: "          <PwaBoot />\n          <SourceCapture />\n          <MetaPixel />\n          <ConsentBanner />\n" },
]);
patch("components/shop/cart.tsx", [
  { label: "import", done: "trackAddToCart", from: '"use client";\n', to: '"use client";\n\nimport { trackAddToCart } from "@/lib/track-client";\n' },
  { label: "count adds", done: "trackAddToCart(line, qty);", from: "  const add = useCallback((line: Omit<CartLine, \"qty\">, qty = 1) => {\n", to: "  const add = useCallback((line: Omit<CartLine, \"qty\">, qty = 1) => {\n    trackAddToCart(line, qty);\n" },
]);
patch("components/shop/checkout-client.tsx", [
  { label: "import", done: "CheckoutStarted", from: 'import { WhatsAppLink } from "@/components/shop/whatsapp-chat";\n', to: 'import { WhatsAppLink } from "@/components/shop/whatsapp-chat";\nimport { CheckoutStarted } from "@/components/track/checkout-started";\n' },
  { label: "mount", done: "<CheckoutStarted", from: '      <form key={pre ? "saved" : "blank"}', to: '      <CheckoutStarted valueKobo={subtotalKobo} ids={items.map((i) => i.productId)} />\n      <form key={pre ? "saved" : "blank"}' },
]);
patch("app/(site)/shop/[productSlug]/page.tsx", [
  { label: "import", done: "PixelEvent", from: 'import { getReviewSummary } from "@/lib/reviews";\n', to: 'import { getReviewSummary } from "@/lib/reviews";\nimport { PixelEvent } from "@/components/track/pixel-event";\n' },
  { label: "view", done: "<PixelEvent", from: "      <JsonLd data={productJsonLd(p, rating)} />\n", to: '      <JsonLd data={productJsonLd(p, rating)} />\n      <PixelEvent event="ViewContent" data={{ content_ids: [p.id], content_name: p.name, content_type: "product", value: p.priceKobo / 100, currency: "NGN" }} />\n' },
]);
patch("app/(site)/order/[reference]/page.tsx", [
  { label: "import", done: "PurchaseEvent", from: 'import { ClearCart } from "@/components/shop/clear-cart";\n', to: 'import { ClearCart } from "@/components/shop/clear-cart";\nimport { PurchaseEvent } from "@/components/track/pixel-event";\n' },
  { label: "purchase", done: "<PurchaseEvent", from: "      {PAID_STATES.has(order.status) && <ClearCart />}\n", to: "      {PAID_STATES.has(order.status) && <ClearCart />}\n      {PAID_STATES.has(order.status) && <PurchaseEvent reference={order.reference} valueKobo={order.totalKobo} items={order.items.map((i) => ({ id: i.productId, quantity: i.quantity, priceKobo: i.unitPriceKobo }))} />}\n" },
]);

// 5. Artist dashboard and admin menu
patch("app/(site)/artist/page.tsx", [
  { label: "import", done: "ArtistLinkCard", from: 'import { Earnings } from "@/components/artist/earnings";\n', to: 'import { Earnings } from "@/components/artist/earnings";\nimport { ArtistLinkCard } from "@/components/artist/link-card";\n' },
  { label: "link card", done: "<ArtistLinkCard", from: "      <Earnings artist=", to: "      <ArtistLinkCard artist={{ id: artist.id, slug: artist.slug, name: artist.name }} />\n\n      <Earnings artist=" },
]);
patch("app/admin/(panel)/layout.tsx", [
  { label: "menu", done: "/admin/funnel", from: '  { href: "/admin/bundles", label: "Bundles", roles: MGR },\n', to: '  { href: "/admin/funnel", label: "Funnel by source", roles: MGR },\n  { href: "/admin/links", label: "Tracked links", roles: MGR },\n  { href: "/admin/bundles", label: "Bundles", roles: MGR },\n' },
]);

console.log(problems ? `\n${problems} step(s) were skipped. Send me the SKIP lines.` : "\nAll done.");
