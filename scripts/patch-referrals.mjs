// Referral codes and credit wallet. Off until you switch referrals on in admin.
// Needs the ops kit (activity log, delivery actions) installed first. Safe to re-run.
import fs from "node:fs";
for (const f of ["lib/audit.ts", "app/admin/(panel)/orders/delivery-actions.ts", "lib/bundle-math.ts", "lib/customer.ts"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the earlier zips first (trust, ops), then run this again.`); process.exit(1); }
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
    label: "order fields", done: "  creditUsedKobo",
    from: "  giftName               String?\n",
    to: `  referralCode           String?
  referrerId             String?
  referralDiscountKobo   Int                  @default(0)
  referralRewardKobo     Int                  @default(0)
  creditUsedKobo         Int                  @default(0)
  giftName               String?
`,
  },
  { label: "customer links", done: "  creditEntries CreditEntry[]", from: "  orders    Order[]\n  regulars  RegularItem[]\n}", to: "  orders    Order[]\n  regulars  RegularItem[]\n  referralCode  ReferralCode?\n  creditEntries CreditEntry[]\n}" },
  {
    label: "settings", done: "  referralEnabled ",
    from: "  heroImageUrl           String?\n",
    to: `  referralEnabled        Boolean  @default(false)
  referralDiscountKobo   Int      @default(0)
  referralRewardKobo     Int      @default(0)
  referralMinOrderKobo   Int      @default(0)
  heroImageUrl           String?
`,
  },
  {
    label: "new models", done: "model ReferralCode {",
    from: "model FunnelEvent {",
    to: `model ReferralCode {
  id         String   @id @default(cuid())
  customerId String   @unique
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  code       String   @unique
  createdAt  DateTime @default(now())
}

// Credit wallet. The balance is the sum of amountKobo. SPENT and RELEASED are tied to an order, once each.
model CreditEntry {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  amountKobo Int // positive adds credit, negative uses it
  kind       String // REFERRAL_REWARD, SPENT, RELEASED, MANUAL
  orderId    String?
  note       String?
  createdAt  DateTime @default(now())

  @@unique([orderId, kind])
  @@index([customerId, createdAt])
}

model FunnelEvent {`,
  },
]);

// 2. Checkout: check the code, use credit, price everything on the server
patch("app/api/checkout/route.ts", [
  {
    label: "imports", done: 'from "@/lib/referral-math"',
    from: 'import { orderAttribution } from "@/lib/attribution";\n',
    to: 'import { orderAttribution } from "@/lib/attribution";\nimport { PAID_STATUSES } from "@/lib/admin/orders";\nimport { applyReferralAndCredit, referralEligibility } from "@/lib/referral-math";\nimport { creditBalance, findCode, getReferralSettings } from "@/lib/referrals";\n',
  },
  { label: "fields", done: "referralCode: z.string()", from: "  marketingConsent: z.boolean().optional(),\n", to: "  marketingConsent: z.boolean().optional(),\n  referralCode: z.string().trim().max(20).optional(),\n  useCredit: z.boolean().optional(),\n" },
  {
    label: "price the referral and credit", done: "const money = applyReferralAndCredit(",
    from: "      const deliveryFee = zone.isPickup || deal?.freeDelivery ? 0 : deliveryFeeFor(zone, subtotal);\n",
    to: `      const deliveryFee = zone.isPickup || deal?.freeDelivery ? 0 : deliveryFeeFor(zone, subtotal);

      // Referral code and credit: checked and priced here, from the database, never from the browser.
      const foodAfterDiscounts = subtotal - discount - promoKobo - bundleKobo;
      let referral: { code: string; ownerId: string; rewardKobo: number } | null = null;
      let referralCfg = 0;
      if (b.referralCode) {
        const [found, rs] = await Promise.all([findCode(b.referralCode, tx), getReferralSettings(tx)]);
        if (!found) throw new CheckoutError("We could not find that referral code. Check it or remove it to continue.");
        const prior = await tx.order.count({ where: { status: { in: PAID_STATUSES }, OR: [{ contactPhone: phone }, { contactEmail: { equals: b.email, mode: "insensitive" } }] } });
        const ok = referralEligibility({ enabled: rs.enabled, ownerId: found.owner.id, ownerPhone: found.owner.phone, ownerEmail: found.owner.email, buyerId: customerId, buyerPhone: phone, buyerEmail: b.email, priorPaidOrders: prior, baseKobo: foodAfterDiscounts, minOrderKobo: rs.minOrderKobo });
        if (!ok.ok) throw new CheckoutError(ok.reason);
        referral = { code: found.code, ownerId: found.owner.id, rewardKobo: rs.rewardKobo };
        referralCfg = rs.discountKobo;
      }
      let creditAvailable = 0;
      if (b.useCredit && customerId) {
        // Lock the customer row so two orders at once cannot spend the same credit.
        await tx.$queryRaw\`SELECT "id" FROM "Customer" WHERE "id" = \${customerId} FOR UPDATE\`;
        creditAvailable = Math.max(0, await creditBalance(tx, customerId));
      }
      const money = applyReferralAndCredit({ baseKobo: foodAfterDiscounts, deliveryKobo: deliveryFee, referralCfgKobo: referralCfg, creditAvailableKobo: creditAvailable, useCredit: !!b.useCredit && !!customerId });
      const referralUsed = referral && money.referralKobo > 0 ? referral : null;
`,
  },
  { label: "keep the order", done: "const created = await tx.order.create({", from: "      return tx.order.create({", to: "      const created = await tx.order.create({" },
  {
    label: "save on order", done: "referralDiscountKobo: money.referralKobo,",
    from: "          bundleDiscountKobo: bundleKobo,\n",
    to: "          bundleDiscountKobo: bundleKobo,\n          referralCode: referralUsed?.code ?? null,\n          referrerId: referralUsed?.ownerId ?? null,\n          referralDiscountKobo: money.referralKobo,\n          referralRewardKobo: referralUsed?.rewardKobo ?? 0,\n          creditUsedKobo: money.creditKobo,\n",
  },
  { label: "total", done: "totalKobo: money.totalKobo,", from: "          totalKobo: subtotal - discount - promoKobo - bundleKobo + deliveryFee,\n", to: "          totalKobo: money.totalKobo,\n" },
  {
    label: "spend the credit", done: 'kind: "SPENT"',
    from: "      });\n    });\n\n    const site = process.env.NEXT_PUBLIC_SITE_URL!;",
    to: '      });\n      if (money.creditKobo > 0 && customerId) {\n        await tx.creditEntry.create({ data: { customerId, amountKobo: -money.creditKobo, kind: "SPENT", orderId: created.id, note: `Order ${created.reference}` } });\n      }\n      return created;\n    });\n\n    const site = process.env.NEXT_PUBLIC_SITE_URL!;',
  },
]);

// 3. Give credit back when an order expires or is cancelled; pay the referrer on delivery
patch("app/api/cron/expire-orders/route.ts", [
  { label: "import", done: 'from "@/lib/referrals"', from: 'import { db } from "@/lib/db";\n', to: 'import { db } from "@/lib/db";\nimport { releaseCredit } from "@/lib/referrals";\n' },
  { label: "release on expiry", done: "await releaseCredit(tx, order.id);", from: "      for (const it of order.items) {\n        await tx.product.update({", to: "      await releaseCredit(tx, order.id);\n      for (const it of order.items) {\n        await tx.product.update({" },
]);
patch("app/admin/(panel)/orders/actions.ts", [
  { label: "import", done: 'from "@/lib/referrals"', from: 'import { audit } from "@/lib/audit";\n', to: 'import { audit } from "@/lib/audit";\nimport { grantReferralReward, releaseCredit } from "@/lib/referrals";\n' },
  { label: "release on cancel", done: "await releaseCredit(tx, order.id);", from: "    if (r.count === 0) return;\n    // Put the held stock back on the shelf.", to: "    if (r.count === 0) return;\n    await releaseCredit(tx, order.id);\n    // Put the held stock back on the shelf." },
  { label: "reward on delivery", done: "await grantReferralReward(order.id)", from: "    await audit(admin, `Moved to ${to}`, reference);\n  }", to: "    await audit(admin, `Moved to ${to}`, reference);\n    if (to === \"DELIVERED\") await grantReferralReward(order.id);\n  }" },
]);
patch("app/admin/(panel)/orders/delivery-actions.ts", [
  { label: "import", done: 'from "@/lib/referrals"', from: 'import { audit } from "@/lib/audit";\n', to: 'import { audit } from "@/lib/audit";\nimport { grantReferralReward } from "@/lib/referrals";\n' },
  { label: "reward on delivery", done: "await grantReferralReward(order.id)", from: '    await notifyOrderStatus(order, "DELIVERED");\n', to: '    await notifyOrderStatus(order, "DELIVERED");\n    await grantReferralReward(order.id);\n' },
]);

// A late payment can revive an expired order. Its credit must count as used again, or the customer would get it twice.
patch("lib/payments.ts", [
  { label: "import", done: 'from "@/lib/referrals"', from: 'import { sendPurchaseEvent } from "@/lib/meta-capi";\n', to: 'import { sendPurchaseEvent } from "@/lib/meta-capi";\nimport { reapplyCredit } from "@/lib/referrals";\n' },
  {
    label: "credit used again on late payment", done: "await reapplyCredit(tx, order.id)",
    from: '    return { order: await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date() } }), fresh: true };\n  });',
    to: '    if (order.creditUsedKobo > 0) await reapplyCredit(tx, order.id);\n    return { order: await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date() } }), fresh: true };\n  });',
  },
]);

// 4. Checkout form
patch("components/shop/checkout-client.tsx", [
  { label: "import", done: 'from "@/components/shop/referral-box"', from: 'import { CheckoutStarted } from "@/components/track/checkout-started";\n', to: 'import { CheckoutStarted } from "@/components/track/checkout-started";\nimport { ReferralBox } from "@/components/shop/referral-box";\n' },
  { label: "send", done: 'referralCode: String(f.get("referralCode")', from: '          marketingConsent: f.get("marketing") === "on",\n', to: '          marketingConsent: f.get("marketing") === "on",\n          referralCode: String(f.get("referralCode") ?? "").trim() || undefined,\n          useCredit: f.get("useCredit") === "on",\n' },
  { label: "box", done: "<ReferralBox />", from: '        <label className="consent-row"><input type="checkbox" name="marketing" />', to: '        <ReferralBox />\n        <label className="consent-row"><input type="checkbox" name="marketing" />' },
]);

// 5. Order pages and account
patch("app/(site)/order/[reference]/page.tsx", [
  {
    label: "summary lines", done: "Referral discount",
    from: '          {order.bundleDiscountKobo > 0 && <div className="summary-discount"><dt>Bundle deal</dt><dd>-{naira(order.bundleDiscountKobo)}</dd></div>}\n',
    to: '          {order.bundleDiscountKobo > 0 && <div className="summary-discount"><dt>Bundle deal</dt><dd>-{naira(order.bundleDiscountKobo)}</dd></div>}\n          {order.referralDiscountKobo > 0 && <div className="summary-discount"><dt>Referral discount</dt><dd>-{naira(order.referralDiscountKobo)}</dd></div>}\n          {order.creditUsedKobo > 0 && <div className="summary-discount"><dt>Fish Guy credit used</dt><dd>-{naira(order.creditUsedKobo)}</dd></div>}\n',
  },
]);
patch("app/admin/(panel)/orders/[reference]/page.tsx", [
  {
    label: "summary lines", done: "Referral discount",
    from: '            {order.promoDiscountKobo > 0 && <div className="flex justify-between"><dt className="text-[#9A9585]">Festive deal</dt><dd>-{formatNaira(order.promoDiscountKobo)}</dd></div>}\n',
    to: '            {order.promoDiscountKobo > 0 && <div className="flex justify-between"><dt className="text-[#9A9585]">Festive deal</dt><dd>-{formatNaira(order.promoDiscountKobo)}</dd></div>}\n            {order.referralDiscountKobo > 0 && <div className="flex justify-between"><dt className="text-[#9A9585]">Referral discount ({order.referralCode})</dt><dd>-{formatNaira(order.referralDiscountKobo)}</dd></div>}\n            {order.creditUsedKobo > 0 && <div className="flex justify-between"><dt className="text-[#9A9585]">Credit used</dt><dd>-{formatNaira(order.creditUsedKobo)}</dd></div>}\n',
  },
]);
patch("app/(site)/account/page.tsx", [
  { label: "import", done: 'from "@/components/account/referral-card"', from: 'import { ReorderButton, type ReorderLine } from "./reorder-button";\n', to: 'import { ReorderButton, type ReorderLine } from "./reorder-button";\nimport { ReferralCard } from "@/components/account/referral-card";\n' },
  { label: "card", done: "<ReferralCard", from: '      <h2 className="account-h2">Past orders</h2>', to: '      <ReferralCard customerId={customer.id} />\n\n      <h2 className="account-h2">Past orders</h2>' },
]);

// 6. Admin menu
patch("app/admin/(panel)/layout.tsx", [
  { label: "menu", done: "/admin/referrals", from: '  { href: "/admin/reviews", label: "Reviews", roles: MGR },\n', to: '  { href: "/admin/reviews", label: "Reviews", roles: MGR },\n  { href: "/admin/referrals", label: "Referrals and credit", roles: MGR },\n' },
]);

console.log(problems ? `\n${problems} step(s) were skipped. Send me the SKIP lines.` : "\nAll done.");
