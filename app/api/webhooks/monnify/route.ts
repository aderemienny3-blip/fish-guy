import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/monnify";
import { settleOrder } from "@/lib/payments";
import { MUSIC_REF, confirmMusicOrder } from "@/lib/music/payments";

// ONE webhook URL for the whole business. Set it in Monnify dashboard > Settings > Webhook URLs.
// Frozen-food references start with FG-, music references with FGS-.
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("monnify-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { eventType?: string; eventData?: { paymentReference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const ref = event.eventData?.paymentReference;
  if (event.eventType === "SUCCESSFUL_TRANSACTION" && ref) {
    try {
      if (ref.startsWith("FGS-")) {
        if (MUSIC_REF.test(ref)) await confirmMusicOrder(ref);
      } else {
        await settleOrder(ref);
      }
    } catch (e) {
      console.error("settle failed", e);
      // Non-2xx makes Monnify retry the webhook.
      return NextResponse.json({ error: "retry" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
