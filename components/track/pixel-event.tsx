"use client";

import { useEffect } from "react";
import { pixel } from "@/lib/track-client";

/** Fires one Meta Pixel event when a page opens (for example ViewContent on a product). */
export function PixelEvent({ event, data }: { event: string; data?: Record<string, unknown> }) {
  useEffect(() => { pixel(event, data); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return null;
}

/** Purchase event on the order page. The order reference is the event id, so Meta counts it once even with the server copy. */
export function PurchaseEvent({ reference, valueKobo, items }: { reference: string; valueKobo: number; items: { id: string; quantity: number; priceKobo: number }[] }) {
  useEffect(() => {
    const key = "fg-purchase-" + reference;
    try { if (window.localStorage.getItem(key)) return; window.localStorage.setItem(key, "1"); } catch { /* still send once per page view */ }
    pixel("Purchase", { value: valueKobo / 100, currency: "NGN", content_type: "product", content_ids: items.map((i) => i.id), contents: items.map((i) => ({ id: i.id, quantity: i.quantity, item_price: i.priceKobo / 100 })) }, reference);
  }, [reference, valueKobo, items]);
  return null;
}
