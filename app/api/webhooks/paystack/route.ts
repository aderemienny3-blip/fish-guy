import { NextResponse } from "next/server";
import { verifyPaystackSignature } from "@/lib/paystack";
import { settleOrder } from "@/lib/payments";
import { AD_PAY_REF } from "@/lib/ads/labels";
import { confirmAdPayment } from "@/lib/ads/payments";
import { MUSIC_REF, confirmMusicOrder } from "@/lib/music/payments";

// ONE webhook URL for the whole business. Set it in Paystack dashboard > Settings > API Keys & Webhooks.
// Frozen-food references start with FG-, music with FGS-, artist ads with FGA-.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const ref = event.data?.reference;
  if (event.event === "charge.success" && ref) {
    try {
      if (ref.startsWith("FGA-")) {
        if (AD_PAY_REF.test(ref)) await confirmAdPayment(ref);
      } else if (ref.startsWith("FGS-")) {
        if (MUSIC_REF.test(ref)) await confirmMusicOrder(ref);
      } else if (/^FG-[A-F0-9]{16}$/.test(ref)) {
        await settleOrder(ref); // each of these verifies with Paystack before marking anything paid
      }
    } catch (e) {
      console.error("paystack settle failed", e);
      return NextResponse.json({ error: "retry" }, { status: 500 }); // non-2xx makes Paystack retry
    }
  }
  return NextResponse.json({ ok: true });
}
