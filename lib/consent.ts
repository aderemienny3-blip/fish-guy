// The visitor's choice about ad tracking. Kept in this browser, and in a cookie so the server knows when saving an order.
export const CONSENT_KEY = "fish-guy-consent-v1";
export type Consent = "yes" | "no" | null;

export function getConsent(): Consent {
  try { const v = window.localStorage.getItem(CONSENT_KEY); return v === "yes" || v === "no" ? v : null; } catch { return null; }
}

export function setConsent(v: "yes" | "no") {
  try { window.localStorage.setItem(CONSENT_KEY, v); } catch { /* storage blocked: the cookie still records it */ }
  document.cookie = `fg_consent=${v === "yes" ? "1" : "0"}; Max-Age=${365 * 86400}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  window.dispatchEvent(new Event("fg-consent"));
}
