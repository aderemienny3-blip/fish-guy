import crypto from "node:crypto";
import { siteUrl } from "@/lib/seo";

const sha = (v: string) => crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex");
const API = "https://graph.facebook.com/v21.0";

type PurchaseOrder = {
  reference: string; contactEmail: string; contactPhone: string; totalKobo: number; paidAt: Date | null;
  trackingConsent: boolean; fbp: string | null; fbc: string | null; trackUa: string | null; trackIp: string | null;
  items: { productId: string; quantity: number; unitPriceKobo: number }[];
};

/**
 * Tells Meta about a paid order from the server, so ad results survive browsers that block the pixel.
 * Sent only when the buyer accepted tracking. Needs NEXT_PUBLIC_META_PIXEL_ID and META_CAPI_TOKEN. Never throws.
 */
export async function sendPurchaseEvent(o: PurchaseOrder): Promise<boolean> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixelId || !token || !o.trackingConsent || !o.trackUa) return false;
  try {
    const user: Record<string, unknown> = {
      em: [sha(o.contactEmail)], ph: [sha(o.contactPhone.replace(/\D/g, ""))], external_id: [sha(o.contactPhone.replace(/\D/g, ""))],
      client_user_agent: o.trackUa,
    };
    if (o.trackIp) user.client_ip_address = o.trackIp;
    if (o.fbp) user.fbp = o.fbp;
    if (o.fbc) user.fbc = o.fbc;
    const body: Record<string, unknown> = {
      data: [{
        event_name: "Purchase", event_time: Math.floor((o.paidAt ?? new Date()).getTime() / 1000), event_id: o.reference,
        action_source: "website", event_source_url: `${siteUrl()}/order/${o.reference}`, user_data: user,
        custom_data: { currency: "NGN", value: o.totalKobo / 100, order_id: o.reference, content_type: "product", contents: o.items.map((i) => ({ id: i.productId, quantity: i.quantity, item_price: i.unitPriceKobo / 100 })) },
      }],
    };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
    const res = await fetch(`${API}/${pixelId}/events?access_token=${encodeURIComponent(token)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(7000), cache: "no-store" });
    if (!res.ok) console.error("meta capi failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("meta capi error", e);
    return false;
  }
}
