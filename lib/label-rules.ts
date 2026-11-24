// Rules for label accounts. Pure, so they can be tested without a database.
export const LABEL_FEE_KOBO = 5_000_000; // ₦50,000 a year
export const LABEL_TERM_DAYS = 365;
export const MAX_LABEL_ARTISTS = 200;
export const MAX_LABEL_MEMBERS = 10;
export const LABEL_PAY_REF = /^FGL-[A-F0-9]{32}$/;

// Free and throwaway mailboxes. A label must use an address on its own company domain.
const FREE_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "yahoo.com.ng", "ymail.com", "rocketmail.com", "outlook.com", "hotmail.com", "hotmail.co.uk",
  "live.com", "msn.com", "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com", "pm.me", "gmx.com", "gmx.net", "mail.com",
  "zoho.com", "yandex.com", "yandex.ru", "tutanota.com", "fastmail.com", "inbox.com", "mailinator.com", "guerrillamail.com", "10minutemail.com",
  "tempmail.com", "yopmail.com", "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc",
]);

export const cleanEmail = (s: string) => s.trim().toLowerCase();

export function isBusinessEmail(raw: string): boolean {
  const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(cleanEmail(raw));
  if (!m || raw.length > 254) return false;
  const domain = m[1];
  return ![...FREE_DOMAINS].some((d) => domain === d || domain.endsWith("." + d));
}

export const isLabelActive = (l: { status: string; paidUntil: Date | null }, now = new Date()) =>
  l.status === "APPROVED" && l.paidUntil !== null && l.paidUntil.getTime() > now.getTime();

/** A renewal adds a full year to whatever time is left, so paying early never wastes days. */
export const renewedUntil = (current: Date | null, now = new Date()) =>
  new Date(Math.max(now.getTime(), current?.getTime() ?? 0) + LABEL_TERM_DAYS * 86_400_000);

export const daysLeft = (until: Date | null, now = new Date()) => (until ? Math.ceil((until.getTime() - now.getTime()) / 86_400_000) : 0);

export const slugOf = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
