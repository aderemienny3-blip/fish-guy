// Ogun delivery: per-area minimum order, delivery days and a customer note.
// Safe to re-run. Run from the project root:  node scripts/patch-ogun-delivery.mjs
import fs from "node:fs";

let problems = 0;
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null);
const nl = (s) => s.replace(/\r\n/g, "\n");

function patch(file, steps) {
  const raw = read(file);
  if (raw === null) { console.log(`SKIP ${file} (not found)`); problems++; return; }
  const crlf = raw.includes("\r\n");
  let src = nl(raw);
  let changed = false;
  for (const { done, from, to, label } of steps) {
    if (src.includes(done)) { console.log(`ok   ${file}: ${label} (already done)`); continue; }
    if (!src.includes(from)) { console.log(`SKIP ${file}: ${label} (anchor not found)`); problems++; continue; }
    src = src.replace(from, to);
    changed = true;
    console.log(`done ${file}: ${label}`);
  }
  if (changed) fs.writeFileSync(file, crlf ? src.replace(/\n/g, "\r\n") : src);
}

// 1. Schema
patch("prisma/schema.prisma", [{
  label: "zone fields",
  done: "deliveryDays",
  from: "  isPickup     Boolean @default(false) // true = collect from the store\n",
  to: "  isPickup     Boolean @default(false) // true = collect from the store\n  minOrderKobo Int? // minimum food subtotal for this area\n  deliveryDays String? // weekdays served, e.g. \"2,6\" = Tue and Sat (Sun=0). Empty = every day\n  note         String? // shown to customers at checkout\n",
}]);

// 2. Helpers
const HELPERS = `
const DAY_FULL = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

/** "2,6" -> [2, 6]. Empty or missing means every day. */
export function zoneDayList(deliveryDays: string | null | undefined): number[] {
  return (deliveryDays ?? "").split(",").map((s) => s.trim()).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

/** Is this YYYY-MM-DD one of the area's delivery weekdays? */
export function zoneAllowsDate(zone: { deliveryDays?: string | null }, date: string): boolean {
  const days = zoneDayList(zone.deliveryDays);
  if (days.length === 0) return true;
  return days.includes(new Date(date + "T00:00:00Z").getUTCDay());
}

/** "Tuesdays and Saturdays" */
export function describeZoneDays(deliveryDays: string | null | undefined): string {
  const names = zoneDayList(deliveryDays).map((d) => DAY_FULL[d]);
  if (names.length <= 1) return names[0] ?? "";
  return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
}
`;
{
  const f = "lib/delivery.ts";
  const src = read(f);
  if (src === null) { console.log(`SKIP ${f}`); problems++; }
  else if (src.includes("zoneAllowsDate")) console.log(`ok   ${f} (already done)`);
  else { fs.writeFileSync(f, src.replace(/\s*$/, "\n") + HELPERS); console.log(`done ${f}`); }
}

// 3. Checkout page passes the new fields
patch("app/(site)/checkout/page.tsx", [{
  label: "pass zone fields",
  done: "minOrderKobo: z.minOrderKobo",
  from: "zones.map((z) => ({ id: z.id, name: z.name, feeKobo: z.feeKobo, freeOverKobo: z.freeOverKobo }))",
  to: "zones.map((z) => ({ id: z.id, name: z.name, feeKobo: z.feeKobo, freeOverKobo: z.freeOverKobo, minOrderKobo: z.minOrderKobo, deliveryDays: z.deliveryDays, note: z.note }))",
}]);

// 4. Checkout client
patch("components/shop/checkout-client.tsx", [
  {
    label: "zone type",
    done: "minOrderKobo: number | null",
    from: "type Zone = { id: string; name: string; feeKobo: number; freeOverKobo: number | null };",
    to: "type Zone = { id: string; name: string; feeKobo: number; freeOverKobo: number | null; minOrderKobo: number | null; deliveryDays: string | null; note: string | null };",
  },
  {
    label: "delivery-day helpers import",
    done: "zoneAllowsDate",
    from: "isSlotBookable",
    to: "isSlotBookable, zoneAllowsDate, describeZoneDays",
  },
  {
    label: "remove old zone line",
    done: "zoneAllowsDate(zone, d)",
    from: "\n  const zone = zones.find((z) => z.id === zoneId) ?? zones[0];\n  const cartonLines",
    to: "\n  const cartonLines",
  },
  {
    label: "days per area",
    done: "zoneAllowsDate(zone, d)",
    from: `  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = today; d <= lastDay; d = addDays(d, 1)) {
      if (slots.some((s) => isSlotBookable(d, s.startMinute))) out.push(d);
    }
    return out;
  }, [today, lastDay, slots]);`,
    to: `  const zone = zones.find((z) => z.id === zoneId) ?? zones[0];
  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = today; d <= lastDay; d = addDays(d, 1)) {
      if (!isPickup && zone && !zoneAllowsDate(zone, d)) continue;
      if (slots.some((s) => isSlotBookable(d, s.startMinute))) out.push(d);
    }
    return out;
  }, [today, lastDay, slots, zone, isPickup]);`,
  },
  {
    label: "minimum order",
    done: "const belowMin",
    from: "  const total = subtotalKobo - discount - promoKobo + fee;\n",
    to: "  const total = subtotalKobo - discount - promoKobo + fee;\n  const minOrder = !isPickup && zone?.minOrderKobo ? zone.minOrderKobo : 0;\n  const belowMin = minOrder > 0 && subtotalKobo < minOrder;\n",
  },
  {
    label: "area note",
    done: "zone.note",
    from: "                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}\n                </select>\n              </label>\n",
    to: "                  {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}\n                </select>\n              </label>\n              {zone && (zone.note || zone.deliveryDays || zone.minOrderKobo) && (\n                <p className=\"field-note span-2\">\n                  {[zone.note, zone.deliveryDays ? `We deliver here on ${describeZoneDays(zone.deliveryDays)} only.` : \"\", zone.minOrderKobo ? `Minimum order ${naira(zone.minOrderKobo)}.` : \"\"].filter(Boolean).join(\" \")}\n                </p>\n              )}\n",
  },
  {
    label: "min order message and button",
    done: "belowMin ||",
    from: "        <button className=\"button button-gold\" type=\"submit\" disabled={busy || items.length === 0 || days.length === 0}>",
    to: "        {belowMin && <p className=\"form-message is-error\" role=\"alert\">Delivery to {zone?.name} needs a minimum order of {naira(minOrder)}. Add {naira(minOrder - subtotalKobo)} more to continue.</p>}\n        <button className=\"button button-gold\" type=\"submit\" disabled={busy || belowMin || items.length === 0 || days.length === 0}>",
  },
  {
    label: "footer wording",
    done: "selected Ogun campus areas. Slots",
    from: "We deliver across Lagos, except Ikorodu. Slots need",
    to: "We deliver across Lagos (except Ikorodu) and selected Ogun campus areas. Slots need",
  },
]);

// 5. Server-side checks
patch("app/api/checkout/route.ts", [
  {
    label: "import",
    done: "zoneAllowsDate",
    from: 'import { deliveryFeeFor, isSlotBookable } from "@/lib/delivery";',
    to: 'import { deliveryFeeFor, describeZoneDays, isSlotBookable, zoneAllowsDate } from "@/lib/delivery";',
  },
  {
    label: "delivery day check",
    done: "We only deliver to",
    from: "      const taken = await tx.order.count({",
    to: "      if (!zone.isPickup && !zoneAllowsDate(zone, b.deliveryDate)) {\n        throw new CheckoutError(`We only deliver to ${zone.name} on ${describeZoneDays(zone.deliveryDays)}. Pick one of those days.`);\n      }\n\n      const taken = await tx.order.count({",
  },
  {
    label: "minimum order check",
    done: "needs a minimum order",
    from: "      // Festive carton deal: worked out here from the database, never from the browser.",
    to: "      if (!zone.isPickup && zone.minOrderKobo && subtotal < zone.minOrderKobo) {\n        throw new CheckoutError(`Delivery to ${zone.name} needs a minimum order of ₦${(zone.minOrderKobo / 100).toLocaleString(\"en-NG\")}.`);\n      }\n\n      // Festive carton deal: worked out here from the database, never from the browser.",
  },
]);

// 6. Wording on other pages
const WORDS = [
  ["app/(site)/delivery-refunds/page.tsx", "We deliver across Lagos, except Ikorodu and its local council development areas.", "We deliver across Lagos, except Ikorodu and its local council development areas, and to selected Ogun campus areas on set days (shown at checkout)."],
  ["app/(site)/festive/page.tsx", "Choose delivery across Lagos (except Ikorodu) or collect", "Choose delivery across Lagos (except Ikorodu) or selected Ogun campus areas, or collect"],
  ["app/(site)/shop/[productSlug]/page.tsx", "Delivered cold across Lagos, except Ikorodu", "Delivered cold across Lagos (except Ikorodu) and selected Ogun campuses"],
  ["app/(site)/shop/page.tsx", "Delivery across Lagos, except Ikorodu.", "Delivery across Lagos (except Ikorodu) and selected Ogun campuses."],
  ["components/shop/storefront-home.tsx", "We deliver across Lagos, except Ikorodu.", "We deliver across Lagos (except Ikorodu) and selected Ogun campuses."],
  ["components/shop/storefront-home.tsx", "Delivery across Lagos, except Ikorodu. Open", "Delivery across Lagos (except Ikorodu) and selected Ogun campuses. Open"],
];
for (const [file, from, to] of WORDS) patch(file, [{ label: "wording", done: to, from, to }]);

console.log(problems ? "\nFinished with notes above. Send me the SKIP lines." : "\nAll done.");
