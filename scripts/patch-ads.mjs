// Wires Fish Guy Ads into your existing files. Safe to run more than once.
// Run in the project folder:  node scripts/patch-ads.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

let problems = 0;

function patch(file, steps) {
  if (!existsSync(file)) { console.log(`MISSING  ${file}`); problems++; return; }
  let s = readFileSync(file, "utf8");
  const crlf = s.includes("\r\n");
  if (crlf) s = s.replace(/\r\n/g, "\n");
  let changed = 0;
  for (const st of steps) {
    if (s.includes(st.done)) continue;
    if (!s.includes(st.find)) { console.log(`CANNOT PATCH  ${file}  (could not find: ${st.find.split("\n")[0].trim()})`); problems++; continue; }
    s = s.replace(st.find, st.replace);
    changed++;
  }
  if (changed) writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`${changed ? "patched " : "ok      "} ${file}`);
}

// 1) Database tables
{
  const f = "prisma/schema.prisma";
  let s = readFileSync(f, "utf8");
  if (!s.includes("model AdPackage")) {
    s += `

// ---- FISH GUY ADS ----

enum AdPlacement {
  POPUP
  STICKER
  FEATURED_STRIP
  BAG_INSERT
}

enum AdStatus {
  SUBMITTED
  APPROVED
  PAID
  REJECTED
  CANCELLED
}

enum AdEventType {
  IMPRESSION
  CLICK
}

model AdPackage {
  id            String       @id @default(cuid())
  name          String
  placement     AdPlacement
  priceKobo     Int
  durationDays  Int
  maxConcurrent Int? // null = no limit
  description   String?
  active        Boolean      @default(true)
  createdAt     DateTime     @default(now())
  campaigns     AdCampaign[]
}

model AdCampaign {
  id           String      @id @default(cuid())
  reference    String      @unique
  packageId    String
  package      AdPackage   @relation(fields: [packageId], references: [id])
  packageName  String
  placement    AdPlacement
  priceKobo    Int
  durationDays Int
  artistName   String
  contactName  String
  phone        String
  email        String
  trackId      String?
  linkUrl      String?
  headline     String
  tagline      String?
  imagePath    String?
  startDate    String // YYYY-MM-DD, Lagos
  endDate      String
  status       AdStatus    @default(SUBMITTED)
  rejectReason String?
  reviewedAt   DateTime?
  paymentRef   String?     @unique
  providerRef  String?
  paidAt       DateTime?
  createdAt    DateTime    @default(now())
  events       AdEvent[]

  @@index([status, placement, startDate, endDate])
  @@index([phone])
}

model AdEvent {
  id         String      @id @default(cuid())
  campaignId String
  campaign   AdCampaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  type       AdEventType
  viewerHash String
  day        String // Lagos date: one impression and one click per viewer per day
  createdAt  DateTime    @default(now())

  @@unique([campaignId, type, viewerHash, day])
  @@index([campaignId, type])
}
`;
    writeFileSync(f, s);
    console.log("patched  prisma/schema.prisma");
  } else console.log("ok       prisma/schema.prisma");
}

// 2) One Monnify webhook for everything
patch("app/api/webhooks/monnify/route.ts", [
  { done: "confirmAdPayment", find: 'import { settleOrder } from "@/lib/payments";', replace: 'import { settleOrder } from "@/lib/payments";\nimport { AD_PAY_REF } from "@/lib/ads/labels";\nimport { confirmAdPayment } from "@/lib/ads/payments";' },
  { done: 'startsWith("FGA-")', find: '      if (ref.startsWith("FGS-")) {', replace: '      if (ref.startsWith("FGA-")) {\n        if (AD_PAY_REF.test(ref)) await confirmAdPayment(ref);\n      } else if (ref.startsWith("FGS-")) {' },
]);

// 3) Admin menu
patch("app/admin/(panel)/layout.tsx", [
  { done: '"/admin/ads"', find: '  { href: "/admin/music"', replace: '  { href: "/admin/ads", label: "Ads", roles: MGR },\n  { href: "/admin/music"' },
]);

// 4) Footer link
patch("components/music/site-shell.tsx", [
  { done: 'href="/advertise"', find: '        <Link href="/sounds/apply">Artist application</Link>', replace: '        <Link href="/advertise">Advertise your music</Link>\n        <Link href="/sounds/apply">Artist application</Link>' },
]);

// 5) Popup on the public site + styles
patch("app/(site)/layout.tsx", [
  { done: "AdPopup", find: 'import { CartProvider } from "@/components/shop/cart";', replace: 'import { CartProvider } from "@/components/shop/cart";\nimport { AdPopup } from "@/components/ads/ad-popup";\nimport "./ads.css";' },
  { done: "<AdPopup />", find: "<MiniPlayer />", replace: "<MiniPlayer />\n          <AdPopup />" },
]);

// 6) Sponsored sticker data on most-ordered products
patch("lib/shop/data.ts", [
  { done: "liveCampaigns", find: 'import { slugifyCategory } from "./format";', replace: 'import { slugifyCategory } from "./format";\nimport { liveCampaigns, type AdView } from "@/lib/ads/data";' },
  { done: "sponsor: AdView", find: "  mostOrdered: boolean;\n};", replace: "  mostOrdered: boolean;\n  sponsor: AdView | null;\n};" },
  { done: "stickers: AdView[]", find: "const toView = (p: Row, top: Set<string>): ShopProduct => ({", replace: "const toView = (p: Row, top: Set<string>, stickers: AdView[] = []): ShopProduct => ({" },
  { done: "stickers[[...top]", find: "  mostOrdered: top.has(p.id),", replace: "  mostOrdered: top.has(p.id),\n  sponsor: top.has(p.id) && stickers.length ? stickers[[...top].indexOf(p.id) % stickers.length] : null," },
  { done: "const [rows, top, stickers]", find: "  const [rows, top] = await Promise.all([", replace: "  const [rows, top, stickers] = await Promise.all([" },
  { done: 'liveCampaigns("STICKER")', find: "    topProductIds(),\n  ]);\n  const all", replace: '    topProductIds(),\n    liveCampaigns("STICKER"),\n  ]);\n  const all' },
  { done: "toView(p, top, stickers)", find: "rows.map((p) => toView(p, top))", replace: "rows.map((p) => toView(p, top, stickers))" },
]);

// 7) Product card tag
patch("components/shop/product-card.tsx", [
  { done: "SponsorTag", find: 'import { AddToCart } from "@/components/shop/add-to-cart";', replace: 'import { AddToCart } from "@/components/shop/add-to-cart";\nimport { SponsorTag } from "@/components/ads/sponsor-tag";' },
  { done: "<SponsorTag", find: '        <Link href={`/shop/${product.slug}`} className="product-name">', replace: '        {product.sponsor && <SponsorTag ad={product.sponsor} />}\n        <Link href={`/shop/${product.slug}`} className="product-name">' },
]);

// 8) Home page strip
patch("components/shop/storefront-home.tsx", [
  { done: "SponsoredStrip", find: 'import { ProductCard } from "@/components/shop/product-card";', replace: 'import { ProductCard } from "@/components/shop/product-card";\nimport { SponsoredStrip } from "@/components/ads/sponsored-strip";\nimport type { AdView } from "@/lib/ads/data";' },
  { done: "sponsored?: AdView", find: "  freeTracks,\n", replace: "  freeTracks,\n  sponsored = null,\n" },
  { done: "sponsored?: AdView | null", find: "  freeTracks: MusicTrack[];\n", replace: "  freeTracks: MusicTrack[];\n  sponsored?: AdView | null;\n" },
  { done: "{sponsored &&", find: "      {categories.length > 0 && (", replace: "      {sponsored && <SponsoredStrip ad={sponsored} />}\n\n      {categories.length > 0 && (" },
]);
patch("app/(site)/page.tsx", [
  { done: "liveCampaigns", find: 'import { getShopData } from "@/lib/shop/data";', replace: 'import { getShopData } from "@/lib/shop/data";\nimport { liveCampaigns } from "@/lib/ads/data";' },
  { done: "const sponsored", find: "export default async function HomePage() {\n", replace: 'export default async function HomePage() {\n  const sponsored = (await liveCampaigns("FEATURED_STRIP"))[0] ?? null;\n' },
  { done: "sponsored={sponsored}", find: "<StorefrontHome ", replace: "<StorefrontHome sponsored={sponsored} " },
]);

if (problems) {
  console.log(`\n${problems} file(s) could not be patched. Send me this output and I will fix it.`);
  process.exit(1);
}
console.log("\nAll done.");
