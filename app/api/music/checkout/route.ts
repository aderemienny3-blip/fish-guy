import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { initPaystack, isPaystackCheckoutUrl } from "@/lib/paystack";
import { geoFrom } from "@/lib/geo";
import { SaleError, chooseAmount, reserveEdition } from "@/lib/music/sales";
import { MUSIC_SESSION_COOKIE, createSessionToken, hashToken, sessionCookie } from "@/lib/music/session";

export const runtime = "nodejs";

function reply(body: object, request: Request, token: string, status = 200) {
  const res = NextResponse.json(body, { status });
  const c = sessionCookie(request, token);
  res.cookies.set(c.name, c.value, c.options);
  return res;
}

const ID = /^[A-Za-z0-9_-]{10,40}$/;
const KEY = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const trackId = typeof body?.trackId === "string" ? body.trackId : "";
  const buyerName = typeof body?.buyerName === "string" ? body.buyerName.trim() : "";
  const buyerEmail = typeof body?.buyerEmail === "string" ? body.buyerEmail.trim().toLowerCase() : "";
  const idempotencyKey = typeof body?.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!ID.test(trackId) || !KEY.test(idempotencyKey) || !buyerName || buyerName.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail) || buyerEmail.length > 254) {
    return NextResponse.json({ error: "Enter a valid name and email to continue." }, { status: 400 });
  }

  // Price always comes from the database, never from the browser.
  // For pay-what-you-want tracks the fan's amount is only accepted if it is at or above the minimum.
  const track = await db.track.findFirst({ where: { id: trackId, isPublished: true } });
  if (!track || track.priceKobo <= 0) {
    return NextResponse.json({ error: "This release is not available for purchase." }, { status: 404 });
  }
  const amount = chooseAmount(track, body?.amountKobo);
  if (!amount.ok) return NextResponse.json({ error: amount.error }, { status: 400 });
  const chargeKobo = amount.kobo;
  let saleError = "";

  const existingToken = (await cookies()).get(MUSIC_SESSION_COOKIE)?.value;
  const token = existingToken || createSessionToken();
  const sessionHash = hashToken(token);

  let order = await db
    .$transaction(async (tx) => {
      await reserveEdition(tx, track); // locks the track and stops a limited edition being oversold
      return tx.musicOrder.create({
      data: {
        buyerSessionHash: sessionHash,
        buyerEmail,
        buyerName,
        reference: `FGS-${randomUUID().replaceAll("-", "").toUpperCase()}`,
        amountKobo: chargeKobo,
        idempotencyKey,
        ...geoFrom(request.headers),
        shareWithArtist: body?.shareWithArtist === true,
        items: { create: { trackId: track.id, unitPriceKobo: chargeKobo } },
      },
      include: { items: true },
      });
    })
    .catch((e) => {
      if (e instanceof SaleError) { saleError = e.message; return null; }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return null;
      throw e;
    });

  if (saleError) return NextResponse.json({ error: saleError }, { status: 409 });
  if (!order) {
    const existing = await db.musicOrder.findUnique({ where: { idempotencyKey }, include: { items: true } });
    if (!existing || existing.buyerSessionHash !== sessionHash || existing.items[0]?.trackId !== track.id ||
        existing.buyerEmail !== buyerEmail || existing.buyerName !== buyerName || existing.amountKobo !== chargeKobo) {
      return NextResponse.json({ error: "This checkout request cannot be reused." }, { status: 409 });
    }
    if (existing.status === "PAID") {
      return reply({ checkoutUrl: `/sounds/return?paymentReference=${encodeURIComponent(existing.reference)}` }, request, token);
    }
    if (existing.status !== "PENDING") {
      return NextResponse.json({ error: "Start a new checkout attempt.", retryWithNewKey: true }, { status: 409 });
    }
    if (existing.checkoutUrl) return reply({ checkoutUrl: existing.checkoutUrl }, request, token);
    order = existing;
  }

  try {
    const origin = new URL(request.url).origin;
    const payment = await initPaystack({
      amountKobo: order.amountKobo,
      reference: order.reference,
      email: order.buyerEmail,
      callbackUrl: `${origin}/sounds/return?paymentReference=${encodeURIComponent(order.reference)}`,
    });
    if (!isPaystackCheckoutUrl(payment.authorizationUrl)) throw new Error("bad checkout host");
    await db.musicOrder.update({
      where: { id: order.id },
      data: { providerRef: payment.reference, checkoutUrl: payment.authorizationUrl },
    });
    return reply({ checkoutUrl: payment.authorizationUrl }, request, token);
  } catch (e) {
    console.error("music checkout failed", e);
    return NextResponse.json({ error: "Secure checkout is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
