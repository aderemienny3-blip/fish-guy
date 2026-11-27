// Where a visitor came from. Saved in a 30-day cookie by the browser, read by the server when an order is created.
export const SRC_COOKIE = "fg_src";
export const CONSENT_COOKIE = "fg_consent";
export const SID_COOKIE = "fg_sid";

export type Attribution = { source: string; medium: string; campaign: string; content: string; ref: string };
export const NO_ATTRIBUTION: Attribution = { source: "", medium: "", campaign: "", content: "", ref: "" };

const clean = (v: unknown, max = 80) => (typeof v === "string" ? v.replace(/[^\w .\-:/@+]/g, "").trim().slice(0, max) : "");

export function cookieValue(header: string | null | undefined, name: string): string {
  if (!header) return "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return ""; }
    }
  }
  return "";
}

export function encodeAttribution(a: Attribution): string {
  return encodeURIComponent(JSON.stringify(a));
}

export function parseAttribution(header: string | null | undefined): Attribution & { fbp: string; fbc: string; consent: boolean } {
  let a = NO_ATTRIBUTION;
  try {
    const j = JSON.parse(cookieValue(header, SRC_COOKIE) || "{}") as Record<string, unknown>;
    a = { source: clean(j.source), medium: clean(j.medium), campaign: clean(j.campaign), content: clean(j.content), ref: clean(j.ref, 40).toLowerCase() };
  } catch { /* a bad cookie counts as no source */ }
  return { ...a, fbp: clean(cookieValue(header, "_fbp"), 100), fbc: clean(cookieValue(header, "_fbc"), 150), consent: cookieValue(header, CONSENT_COOKIE) === "1" };
}

/** Reads the address bar. "strong" means the link carried a tag (utm, ref, fbclid) and should replace an older source. */
export function fromLocation(search: string, referrer: string, host: string): { att: Attribution; strong: boolean } | null {
  const p = new URLSearchParams(search);
  const source = clean(p.get("utm_source")) || (p.get("fbclid") ? "facebook" : "");
  const att: Attribution = {
    source,
    medium: clean(p.get("utm_medium")) || (p.get("fbclid") ? "paid-social" : ""),
    campaign: clean(p.get("utm_campaign")),
    content: clean(p.get("utm_content")),
    ref: clean(p.get("ref"), 40).toLowerCase(),
  };
  if (att.source || att.campaign || att.content || att.ref) return { att, strong: true };
  try {
    const h = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : "";
    if (h && h !== host.replace(/^www\./, "")) return { att: { ...NO_ATTRIBUTION, source: clean(h), medium: "referral" }, strong: false };
  } catch { /* ignore */ }
  return null;
}

/** One label for reports: the utm source, else the tracked link, else direct. */
export const sourceKey = (source: string | null | undefined, ref: string | null | undefined) => source || (ref ? `link:${ref}` : "direct");

type H = { get(name: string): string | null };
const ipOf = (h: H) => (h.get("x-forwarded-for") ?? "").split(",")[0].trim().slice(0, 64) || null;

/** Fields saved on a shop order. Browser details are kept only when the visitor accepted tracking. */
export function orderAttribution(h: H) {
  const c = parseAttribution(h.get("cookie"));
  return {
    utmSource: c.source || null, utmMedium: c.medium || null, utmCampaign: c.campaign || null, utmContent: c.content || null, refCode: c.ref || null,
    trackingConsent: c.consent,
    fbp: c.consent ? c.fbp || null : null,
    fbc: c.consent ? c.fbc || null : null,
    trackUa: c.consent ? (h.get("user-agent") ?? "").slice(0, 200) || null : null,
    trackIp: c.consent ? ipOf(h) : null,
  };
}

export function musicAttribution(h: H) {
  const c = parseAttribution(h.get("cookie"));
  return { utmSource: c.source || null, utmCampaign: c.campaign || null, refCode: c.ref || null };
}
