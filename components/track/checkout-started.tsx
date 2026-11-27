"use client";

import { useEffect, useRef } from "react";
import { pixel, trackEvent } from "@/lib/track-client";

/** Counts "checkout started" once, when the checkout page has a cart in it. */
export function CheckoutStarted({ valueKobo, ids }: { valueKobo: number; ids: string[] }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || ids.length === 0) return;
    done.current = true;
    trackEvent("CHECKOUT_STARTED");
    pixel("InitiateCheckout", { value: valueKobo / 100, currency: "NGN", content_ids: ids, content_type: "product", num_items: ids.length });
  }, [valueKobo, ids]);
  return null;
}
