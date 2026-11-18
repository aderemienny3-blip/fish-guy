"use client";

/** Fire-and-forget ad event. Once per browser session per ad; the server also keeps one per viewer per day. */
export function recordAd(id: string, type: "IMPRESSION" | "CLICK") {
  const key = `fg-ad-${type}-${id}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
  } catch { /* ignore */ }
  const body = JSON.stringify({ id, type });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon("/api/ads/event", new Blob([body], { type: "application/json" }))) return;
  } catch { /* fall through */ }
  void fetch("/api/ads/event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}
