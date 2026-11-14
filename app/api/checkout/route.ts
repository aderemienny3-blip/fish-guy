import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { auth } from "@/lib/customer-auth";
import { initTransaction } from "@/lib/monnify";
import { normalizeNgPhone } from "@/lib/phone";
import { deliveryFeeFor, isSlotBookable } from "@/lib/delivery";

const HOLD_MINUTES = 30;

const Body = z.object({
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().min(1).max(50) })).min(1),
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string(),
  addressLine: z.string().trim().min(5),
  landmark: z.string().trim().optional(),
  notes: z.string().trim().max(300).optional(),
  zoneId: z.string(),
  slotId: z.string(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

class CheckoutError extends Error {}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });
  }
  const b = parsed.data;
  const phone = normalizeNgPhone(b.phone);
  if (!phone) return NextResponse.json({ error: "Enter a valid Nigerian phone number." }, { status: 400 });

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
      for (const p of products) {
        const qty = qtyById.get(p.id)!;
        // Conditional decrement: succeeds only if enough stock remains (race-safe).
        const r = await tx.product.updateMany({
          where: { id: p.id, stockQty: { gte: qty } },
          data: { stockQty: { decrement: qty } },
        });
        if (r.count === 0) throw new CheckoutError(`Sorry, ${p.name} doesn't have enough stock.`);
        subtotal += p.priceKobo * qty;
      }

      const deliveryFee = deliveryFeeFor(zone, subtotal);

      return tx.order.create({
        data: {
          reference,
          customerId,
          contactName: b.name,
          contactEmail: b.email,
          contactPhone: phone,
          addressLine: b.addressLine,
          landmark: b.landmark || null,
          notes: b.notes || null,
          zoneId: zone.id,
          slotId: slot.id,
          deliveryDate: b.deliveryDate,
          subtotalKobo: subtotal,
          deliveryFeeKobo: deliveryFee,
          totalKobo: subtotal + deliveryFee,
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
    });

    const site = process.env.NEXT_PUBLIC_SITE_URL!;
    const init = await initTransaction({
      amountKobo: order.totalKobo,
      paymentReference: order.reference,
      customerName: order.contactName,
      customerEmail: order.contactEmail,
      description: `Fish Guy order ${order.reference}`,
      redirectUrl: `${site}/order/${order.reference}`,
    });

    await db.payment.create({
      data: {
        orderId: order.id,
        reference: order.reference,
        providerRef: init.transactionReference,
        amountKobo: order.totalKobo,
      },
    });

    return NextResponse.json({ checkoutUrl: init.checkoutUrl, reference: order.reference });
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("checkout failed", e);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
