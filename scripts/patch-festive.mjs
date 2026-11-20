// Wires the festive carton deals + store pickup into your existing files. Safe to run more than once.
// Run in the project folder:  node scripts/patch-festive.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

let problems = 0;
function patch(file, steps, { optional = false } = {}) {
  if (!existsSync(file)) { if (!optional) { console.log(`MISSING  ${file}`); problems++; } return; }
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

// ---- database ----
patch("prisma/schema.prisma", [
  { done: "cartonKg", find: "  stockQty    Int         @default(0)\n", replace: "  stockQty    Int         @default(0)\n  cartonKg    Int? // kg in one carton (10 chicken, 20 fish). Empty = not sold by the carton\n" },
  { done: "isPickup", find: "  freeOverKobo Int? // free delivery above this subtotal, optional\n  active       Boolean @default(true)\n", replace: "  freeOverKobo Int? // free delivery above this subtotal, optional\n  active       Boolean @default(true)\n  isPickup     Boolean @default(false) // true = collect from the store\n" },
  { done: "promoDiscountKobo", find: "  discountKobo           Int                  @default(0)\n", replace: "  discountKobo           Int                  @default(0)\n  promoDiscountKobo      Int                  @default(0)\n  giftName               String?\n" },
  { done: "model FestivePromo", find: "// ---- FISH GUY SOUNDS", replace: `// ---- FISH GUY FESTIVE CARTON DEALS ----

model FestivePromo {
  id               Int      @id @default(1)
  active           Boolean  @default(false)
  title            String   @default("Festive Carton Deals")
  startDate        String   @default("2026-12-15") // Lagos date, YYYY-MM-DD
  endDate          String   @default("2027-01-09") // last day included
  giftMinCartons   Int      @default(2)
  giftName         String?
  giftQty          Int      @default(0)
  bigMinCartons    Int      @default(5)
  rewardType       String   @default("NONE") // NONE | PERCENT | PER_CARTON | FREE_DELIVERY
  rewardValue      Int      @default(0) // percent, or kobo off per carton
  stackWithStudent Boolean  @default(false)
  updatedAt        DateTime @updatedAt
}

// ---- FISH GUY SOUNDS` },
]);

// ---- shop data ----
patch("lib/shop/data.ts", [
  { done: "cartonKg: number | null;", find: "  sponsor: AdView | null;", replace: "  sponsor: AdView | null;\n  cartonKg: number | null;" },
  { done: "cartonKg: p.cartonKg,", find: "  mostOrdered: top.has(p.id),", replace: "  cartonKg: p.cartonKg,\n  mostOrdered: top.has(p.id)," },
]);
patch("app/api/shop/cart-check/route.ts", [
  { done: "cartonKg: true", find: "unit: true, stockQty: true, imageUrl: true", replace: "unit: true, stockQty: true, imageUrl: true, cartonKg: true" },
]);

// ---- product page: "Add 1 carton" ----
patch("app/(site)/shop/[productSlug]/page.tsx", [
  { done: "CartonButton", find: 'import { AddToCart } from "@/components/shop/add-to-cart";', replace: 'import { AddToCart } from "@/components/shop/add-to-cart";\nimport { CartonButton } from "@/components/shop/carton-button";' },
  { done: "<CartonButton", find: "<AddToCart product={p} withQuantity />", replace: '<AddToCart product={p} withQuantity />\n          {p.cartonKg && p.unit === "kg" && <CartonButton product={p} cartonKg={p.cartonKg} />}' },
]);
patch("components/shop/add-to-cart.tsx", [
  { done: "const MAX_PER_ORDER = 200;", find: "const MAX_PER_ORDER = 50;", replace: "const MAX_PER_ORDER = 200;" },
]);

// ---- cart drawer progress ----
patch("components/shop/cart-drawer.tsx", [
  { done: "PromoProgress", find: 'import { useCart } from "@/components/shop/cart";', replace: 'import { useCart } from "@/components/shop/cart";\nimport { PromoProgress } from "@/components/shop/promo-progress";' },
  { done: "<PromoProgress />", find: '          <div className="cart-drawer-footer">', replace: '          {lines.length > 0 && <PromoProgress />}\n\n          <div className="cart-drawer-footer">' },
]);

// ---- site layout: ribbon + pop-up + styles ----
patch("app/(site)/layout.tsx", [
  { done: "FestivePopup", find: 'import { CartProvider } from "@/components/shop/cart";', replace: 'import { CartProvider } from "@/components/shop/cart";\nimport { FestivePopup, FestiveRibbon } from "@/components/shop/festive-popup";' },
  { done: 'import "./festive.css"', find: 'import "./site.css";', replace: 'import "./site.css";\nimport "./festive.css";' },
  { done: "<FestiveRibbon />", find: "<SiteHeader />", replace: "<FestiveRibbon />\n            <SiteHeader />" },
  { done: "<FestivePopup />", find: "<MiniPlayer />", replace: "<MiniPlayer />\n          <FestivePopup />" },
]);
// The festive pop-up goes first; skip the artist ad pop-up while it is open.
patch("components/ads/ad-popup.tsx", [
  { done: '.festive-popup', find: "          if (cancelled) return;\n          setAd(pick);", replace: '          if (cancelled || document.querySelector(".festive-popup")) return;\n          setAd(pick);' },
], { optional: true });

// ---- admin: carton size on products, nav link ----
patch("components/admin/ProductFields.tsx", [
  { done: 'name="cartonKg"', find: '      <label className="flex items-center gap-2 text-sm">\n        <input type="checkbox" name="active"',
    replace: '      <div>\n        <label className={label} htmlFor="cartonKg">Carton size in kg (optional)</label>\n        <input id="cartonKg" name="cartonKg" type="number" min={1} max={100} defaultValue={product?.cartonKg ?? ""} className={input} placeholder="e.g. 20 for fish, 10 for chicken" />\n        <p className="mt-1 text-xs text-[#9A9585]">Only for products priced per kg. Customers get an “Add 1 carton” button and cartons count towards the festive deal.</p>\n      </div>\n\n      <label className="flex items-center gap-2 text-sm">\n        <input type="checkbox" name="active"' },
]);
patch("app/admin/(panel)/products/actions.ts", [
  { done: "cartonKg:", find: '    active: fd.get("active") === "on",', replace: '    active: fd.get("active") === "on",\n    cartonKg: (() => { const n = Math.round(Number(str(fd, "cartonKg"))); return Number.isFinite(n) && n >= 1 && n <= 100 ? n : null; })(),' },
]);
patch("app/admin/(panel)/layout.tsx", [
  { done: "/admin/festive", find: '  { href: "/admin/delivery", label: "Delivery", roles: MGR },', replace: '  { href: "/admin/delivery", label: "Delivery", roles: MGR },\n  { href: "/admin/festive", label: "Festive deals", roles: MGR },' },
]);

// ---- order pages: show the festive discount and the gift ----
patch("app/(site)/order/[reference]/page.tsx", [
  { done: "order.promoDiscountKobo", find: '{order.discountKobo > 0 && <div className="summary-discount"><dt>Student discount</dt><dd>-{naira(order.discountKobo)}</dd></div>}',
    replace: '{order.discountKobo > 0 && <div className="summary-discount"><dt>Student discount</dt><dd>-{naira(order.discountKobo)}</dd></div>}\n          {order.promoDiscountKobo > 0 && <div className="summary-discount"><dt>Festive deal</dt><dd>-{naira(order.promoDiscountKobo)}</dd></div>}\n          {order.giftName && <div className="summary-gift"><dt>Free gift</dt><dd>{order.giftName}</dd></div>}' },
]);
patch("app/admin/(panel)/orders/[reference]/page.tsx", [
  { done: "order.promoDiscountKobo", find: '{order.discountKobo > 0 && <div className="flex justify-between"><dt className="text-[#9A9585]">Student discount</dt><dd>-{formatNaira(order.discountKobo)}</dd></div>}',
    replace: '{order.discountKobo > 0 && <div className="flex justify-between"><dt className="text-[#9A9585]">Student discount</dt><dd>-{formatNaira(order.discountKobo)}</dd></div>}\n            {order.promoDiscountKobo > 0 && <div className="flex justify-between"><dt className="text-[#9A9585]">Festive deal</dt><dd>-{formatNaira(order.promoDiscountKobo)}</dd></div>}\n            {order.giftName && <div className="flex justify-between font-semibold text-[#D4AF37]"><dt>PACK A GIFT</dt><dd>{order.giftName}</dd></div>}' },
]);
patch("app/admin/(panel)/orders/manifest/page.tsx", [
  { done: "o.giftName", find: '{o.notes && <p className="italic">Note: {o.notes}</p>}', replace: '{o.notes && <p className="italic">Note: {o.notes}</p>}\n                    {o.giftName && <p className="font-semibold">GIFT: {o.giftName}</p>}' },
]);

console.log(problems ? `\n${problems} problem(s) above. Tell me what it printed.` : "\nAll done.");
