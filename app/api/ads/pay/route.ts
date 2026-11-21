import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { initPaystack } from "@/lib/paystack";
import { AD_REF } from "@/lib/ads/labels";
import { confirmAdPayment, effectiveDates, overlapCount } from "@/lib/ads/payments";

const Body = z.object({ reference: z.string().regex(AD_REF) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const c = await db.adCampaign.findUnique({ where: { reference: parsed.data.reference }, include: { package: true } });
  if (!c) return NextResponse.json({ error: "Ad not found." }, { status: 404 });
  if (c.status === "PAID") return NextResponse.json({ error: "This ad is already paid." }, { status: 409 });
  if (c.status !== "APPROVED") return NextResponse.json({ error: "This ad is not ready for payment." }, { status: 409 });

  // If an earlier attempt was actually paid, settle it instead of charging twice.
  if (c.paymentRef && (await confirmAdPayment(c.paymentRef).catch(() => false))) {
    return NextResponse.json({ error: "Your payment was already received." }, { status: 409 });
  }

  const dates = effectiveDates(c);
  if (c.package.maxConcurrent !== null) {
    const taken = await overlapCount(c.packageId, dates.startDate, dates.endDate, ["PAID"], c.id);
    if (taken >= c.package.maxConcurrent) return NextResponse.json({ error: "This package is fully booked for those dates. Contact us to pick new dates." }, { status: 409 });
  }

  try {
    const paymentRef = "FGA-" + crypto.randomBytes(16).toString("hex").toUpperCase();
    const init = await initPaystack({
      amountKobo: c.priceKobo,
      reference: paymentRef,
      email: c.email,
      callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/advertise/${c.reference}`,
    });
    await db.adCampaign.update({ where: { id: c.id }, data: { paymentRef, providerRef: init.reference } });
    return NextResponse.json({ checkoutUrl: init.authorizationUrl });
  } catch (e) {
    console.error("ad payment init failed", e);
    return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
  }
}
