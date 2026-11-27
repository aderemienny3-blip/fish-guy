"use client";
import { SID_COOKIE, cookieValue } from "@/lib/attribution";
import { getConsent } from "@/lib/consent";

type W = Window & { fbq?: (...a: unknown[]) => void; __fgq?: unknown[][] };

/** A random id for this browser visit. It has no name or phone number in it. */
export function sessionId(): string {
  let id = cookieValue(document.cookie, SID_COOKIE);
  if (!/^[a-f0-9]{16,32}$/.test(id)) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");
    document.cookie = `${SID_COOKIE}=${id}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  }
  return id;
}

/** Counts a step of the shopping funnel. Anonymous, once per visit per day. */
export function trackEvent(type: "VISIT" | "ADD_TO_CART" | "CHECKOUT_STARTED") {
  try {
    const body = JSON.stringify({ type, sid: sessionId() });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch { /* tracking must never break the shop */ }
}

/** Sends a Meta Pixel event, but only if the visitor accepted tracking. Events sent before the pixel loads wait in a queue. */
export function pixel(event: string, data?: Record<string, unknown>, eventId?: string) {
  try {
    const w = window as W;
    if (w.fbq) w.fbq("track", event, data, eventId ? { eventID: eventId } : undefined);
    else if (getConsent() === "yes") (w.__fgq ||= []).push([event, data, eventId]);
  } catch { /* ignore */ }
}

export function trackAddToCart(line: { productId: string; name: string; priceKobo: number }, qty: number) {
  trackEvent("ADD_TO_CART");
  pixel("AddToCart", { content_ids: [line.productId], content_name: line.name, content_type: "product", value: (line.priceKobo * qty) / 100, currency: "NGN" });
}
