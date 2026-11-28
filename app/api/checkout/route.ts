import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/customer-auth";
import { initPaystack } from "@/lib/paystack";
import { normalizeNgPhone } from "@/lib/phone";
import { deliveryFeeFor, describeZoneDays, isSlotBookable, zoneAllowsDate } from "@/lib/delivery";
import { discountFor, findUsableVerification, getStudentRules } from "@/lib/student";
import { loadLivePromo } from "@/lib/festive";
import { MAX_QTY, cartonsOf, evaluatePromo, resolveDiscounts } from "@/lib/festive-math";
import { applyBundles } from "@/lib/bundle-math";
import { orderAttribution } from "@/lib/attribution";
import { PAID_STATUSES } from "@/lib/admin/orders";
import { applyReferralAndCredit, referralEligibility } from "@/lib/referral-math";
import { creditBalance, findCode, getReferralSettings } from "@/lib/referrals";

const HOLD_MINUTES = 30;

const Body = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(MAX_QTY) })).min(1),
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string(),
  addressLine: z.string().trim().min(5),
  landmark: z.string().trim().optional(),
  notes: z.string().trim().max(300).optional(),
  zoneId: z.string(),
  slotId: z.string(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  studentRef: z.string().optional(),
  marketingConsent: z.boolean().optional(),
  referralCode: z.string().trim().max(20).optional(),
  useCredit: z.boolean().optional(),
});

class CheckoutError extends Error {}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });
  }
  const b = parsed.data;
  const attribution = orderAttribution(req.headers);
  const phone = normalizeNgPhone(b.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid Nigerian phone number." }, { status: 400 });

  // Student discount: only with an approved, unexpired verification bound to this phone number.
  let studentVerificationId: string | null = null;
  let studentPercent = 0;
  let studentMax: number | null = null;
  if (b.studentRef) {
    const [v, rules] = await Promise.all([findUsableVerification(b.studentRef, phone), getStudentRules()]);
    if (!v || rules.percent <= 0) {
      return NextResponse.json(
        { error: "Your student discount could not be applied. Use the phone number you verified with, or remove the discount to continue." },
        { status: 409 },
      );
    }
    studentVerificationId = v.id;
    studentPercent = rules.percent;
    studentMax = rules.maxKobo;
  }

  const session = await auth();
  const customerId = (session as unknown as { customerId?: string } | null)?.customerId ?? null;

  const reference = "FG-" + crypto.randomBytes(8).toString("hex").toUpperCase();

  try {
    const order = await db.$transaction(async (tx) => {
      const [zone, slot] = await Promise.all([
        tx.deliveryZone.findFirst({ where: { id: b.zoneId, active: true } }),
        tx.deliverySlot.findFirst({ where: { id: b.slotId, active: true } }),
      ]);
      if (!zone) throw new CheckoutError("That delivery area is unavailable.");
      if (!slot) throw new CheckoutError("That delivery slot is unavailable.");
      if (!isSlotBookable(b.deliveryDate, slot.startMinute)) {
        throw new CheckoutError("That delivery time can no longer be booked. Pick another.");
      }

      if (!zone.isPickup && !zoneAllowsDate(zone, b.deliveryDate)) {
        throw new CheckoutError(`We only deliver to ${zone.name} on ${describeZoneDays(zone.deliveryDays)}. Pick one of those days.`);
      }

      const taken = await tx.order.count({
        where: {
          slotId: slot.id,
          deliveryDate: b.deliveryDate,
          OR: [
            { status: { in: ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] } },
            { status: "PENDING_PAYMENT", expiresAt: { gt: new Date() } },
          ],
        },
      });
      if (taken >= slot.maxOrders) throw new CheckoutError("That slot is full. Pick another.");

      // Merge duplicate lines, then price everything from the database, never from the client.
      const qtyById = new Map<string, number>();
      for (const i of b.items) qtyById.set(i.productId, (qtyById.get(i.productId) ?? 0) + i.quantity);

      const products = await tx.product.findMany({
        where: { id: { in: [...qtyById.keys()] }, active: true },
      });
      if (products.length !== qtyById.size) throw new CheckoutError("An item in your cart is no longer available.");

      let subtotal = 0;
      let cartonValue = 0;
      const cartonLines: { qty: number; cartonKg: number | null }[] = [];
      for (const p of products) {
        const qty = qtyById.get(p.id)!;
        // Conditional decrement: succeeds only if enough stock remains (race-safe).
        const r = await tx.product.updateMany({
          where: { id: p.id, stockQty: { gte: qty } },
          data: { stockQty: { decrement: qty } },
        });
        if (r.count === 0) throw new CheckoutError(`Sorry, ${p.name} doesn't have enough stock.`);
        subtotal += p.priceKobo * qty;
        if (p.unit === "kg" && p.cartonKg) {
          cartonLines.push({ qty, cartonKg: p.cartonKg });
          cartonValue += p.priceKobo * qty;
        }
      }

      if (!zone.isPickup && zone.minOrderKobo && subtotal < zone.minOrderKobo) {
        throw new CheckoutError(`Delivery to ${zone.name} needs a minimum order of ₦${(zone.minOrderKobo / 100).toLocaleString("en-NG")}.`);
      }

      // Festive carton deal: worked out here from the database, never from the browser.
      const promo = await loadLivePromo(tx);
      const deal = promo ? evaluatePromo(promo, cartonsOf(cartonLines), cartonValue) : null;

      // Bundle deals: found from the cart contents and priced from the database. The student discount applies to what is left.
      const bundleRows = await tx.bundle.findMany({ where: { active: true }, include: { items: true } });
      const bundleDeal = applyBundles(
        bundleRows.map((b) => ({ id: b.id, name: b.name, priceKobo: b.priceKobo, items: b.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) })),
        qtyById,
        new Map(products.map((p) => [p.id, p.priceKobo])),
      );
      const bundleKobo = Math.min(bundleDeal.savingKobo, subtotal);
      const studentRaw = studentVerificationId ? discountFor(subtotal - bundleKobo, studentPercent, studentMax) : 0;
      const { promoKobo, studentKobo } = resolveDiscounts({
        subtotalKobo: subtotal - bundleKobo,
        promoKobo: deal?.discountKobo ?? 0,
        studentKobo: studentRaw,
        stack: promo?.stackWithStudent ?? false,
      });
      const discount = studentKobo;
      // Store pickup is always free. Otherwise the free-delivery threshold is judged on the food total before discounts.
      const deliveryFee = zone.isPickup || deal?.freeDelivery ? 0 : deliveryFeeFor(zone, subtotal);

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
        await tx.$queryRaw`SELECT "id" FROM "Customer" WHERE "id" = ${customerId} FOR UPDATE`;
        creditAvailable = Math.max(0, await creditBalance(tx, customerId));
      }
      const money = applyReferralAndCredit({ baseKobo: foodAfterDiscounts, deliveryKobo: deliveryFee, referralCfgKobo: referralCfg, creditAvailableKobo: creditAvailable, useCredit: !!b.useCredit && !!customerId });
      const referralUsed = referral && money.referralKobo > 0 ? referral : null;

      const created = await tx.order.create({
        data: {
          reference,
          customerId,
          contactName: b.name,
          contactEmail: b.email,
          contactPhone: phone,
          addressLine: zone.isPickup ? "Store pickup" : b.addressLine,
          landmark: zone.isPickup ? null : b.landmark || null,
          notes: b.notes || null,
          zoneId: zone.id,
          slotId: slot.id,
          deliveryDate: b.deliveryDate,
          subtotalKobo: subtotal,
          deliveryFeeKobo: deliveryFee,
          discountKobo: discount,
          studentVerificationId: discount > 0 ? studentVerificationId : null,
          promoDiscountKobo: promoKobo,
          bundleDiscountKobo: bundleKobo,
          referralCode: referralUsed?.code ?? null,
          referrerId: referralUsed?.ownerId ?? null,
          referralDiscountKobo: money.referralKobo,
          referralRewardKobo: referralUsed?.rewardKobo ?? 0,
          creditUsedKobo: money.creditKobo,
          ...attribution,
          giftName: deal?.gift ?? null,
          totalKobo: money.totalKobo,
          expiresAt: new Date(Date.now() + HOLD_MINUTES * 60 * 1000),
          items: {
            create: products.map((p) => ({
              productId: p.id,
              nameSnapshot: p.name,
              unitPriceKobo: p.priceKobo,
              quantity: qtyById.get(p.id)!,
            })),
          },
        },
      });
      if (money.creditKobo > 0 && customerId) {
        await tx.creditEntry.create({ data: { customerId, amountKobo: -money.creditKobo, kind: "SPENT", orderId: created.id, note: `Order ${created.reference}` } });
      }
      return created;
    });

    const site = process.env.NEXT_PUBLIC_SITE_URL!;
    const init = await initPaystack({
      amountKobo: order.totalKobo,
      reference: order.reference,
      email: order.contactEmail,
      callbackUrl: `${site}/order/${order.reference}`,
    });

    await db.payment.create({
      data: {
        orderId: order.id,
        reference: order.reference,
        provider: "paystack",
        providerRef: init.reference,
        amountKobo: order.totalKobo,
        checkoutUrl: init.authorizationUrl,
      },
    });

    // Offers and reminders only if the customer ticked the box. Order messages do not need it.
    if (b.marketingConsent) {
      await db.messagingConsent
        .upsert({ where: { phone: order.contactPhone }, update: { marketing: true, source: "checkout", consentedAt: new Date(), optedOutAt: null }, create: { phone: order.contactPhone, marketing: true, source: "checkout" } })
        .catch((e) => console.error("consent not saved", e));
    }

    return NextResponse.json({ checkoutUrl: init.authorizationUrl, reference: order.reference });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("checkout failed", e);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
