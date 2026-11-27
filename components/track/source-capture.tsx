"use client";

import { useEffect } from "react";
import { SRC_COOKIE, encodeAttribution, fromLocation } from "@/lib/attribution";
import { trackEvent } from "@/lib/track-client";

/** Remembers which ad, link or site sent the visitor, and counts the visit. Renders nothing. */
export function SourceCapture() {
  useEffect(() => {
    const r = fromLocation(window.location.search, document.referrer, window.location.hostname);
    const have = document.cookie.split(";").some((c) => c.trim().startsWith(SRC_COOKIE + "="));
    if (r && (r.strong || !have)) {
      document.cookie = `${SRC_COOKIE}=${encodeAttribution(r.att)}; Max-Age=${30 * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    }
    trackEvent("VISIT");
  }, []);
  return null;
}
