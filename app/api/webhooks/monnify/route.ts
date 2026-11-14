import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/monnify";
import { settleOrder } from "@/lib/payments";

// Set this URL in Monnify dashboard > Settings > Webhook URLs (transaction completion).
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

  if (event.eventType === "SUCCESSFUL_TRANSACTION" && event.eventData?.paymentReference) {
    try {
      await settleOrder(event.eventData.paymentReference);
    } catch (e) {
      console.error("settle failed", e);
      // Non-2xx makes Monnify retry the webhook.
      return NextResponse.json({ error: "retry" }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
