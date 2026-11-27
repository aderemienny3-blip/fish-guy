"use client";

import { useEffect } from "react";
import { getConsent } from "@/lib/consent";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
type W = Window & { fbq?: ((...a: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown }; _fbq?: unknown; __fgq?: unknown[][] };

function load(id: string) {
  const w = window as W;
  if (w.fbq) return;
  const n = function (...args: unknown[]) { if (n.callMethod) n.callMethod(...args); else n.queue!.push(args); } as NonNullable<W["fbq"]>;
  w.fbq = n; if (!w._fbq) w._fbq = n;
  n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
  const s = document.createElement("script");
  s.async = true; s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  n("init", id);
  n("track", "PageView");
  for (const [event, data, eventId] of w.__fgq ?? []) n("track", event, data, eventId ? { eventID: eventId } : undefined);
  w.__fgq = [];
}

/** Loads the Meta Pixel only after the visitor accepted tracking, and only when NEXT_PUBLIC_META_PIXEL_ID is set. */
export function MetaPixel() {
  useEffect(() => {
    if (!PIXEL_ID) return;
    const go = () => { if (getConsent() === "yes") load(PIXEL_ID); };
    go();
    window.addEventListener("fg-consent", go);
    return () => window.removeEventListener("fg-consent", go);
  }, []);
  return null;
}
