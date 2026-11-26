// What checkout remembers about a returning buyer on this device. Stored in the browser only.
export const CHECKOUT_KEY = "fish-guy-checkout-v1";

export type Prefill = { name: string; phone: string; email: string; addressLine: string; landmark: string; zoneId: string };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

export function loadSaved(): Prefill | null {
  try {
    const raw = window.localStorage.getItem(CHECKOUT_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Record<string, unknown>;
    const p: Prefill = {
      name: text(j.name, 80), phone: text(j.phone, 20), email: text(j.email, 120),
      addressLine: text(j.addressLine, 200), landmark: text(j.landmark, 120), zoneId: text(j.zoneId, 60),
    };
    return p.name || p.phone || p.email ? p : null;
  } catch {
    return null;
  }
}

export function saveDetails(p: Prefill) {
  try { window.localStorage.setItem(CHECKOUT_KEY, JSON.stringify(p)); } catch { /* storage blocked: nothing to remember */ }
}

export function clearSaved() {
  try { window.localStorage.removeItem(CHECKOUT_KEY); } catch { /* ignore */ }
}
