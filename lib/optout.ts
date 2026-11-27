import crypto from "node:crypto";

const mac = (phone: string) => crypto.createHmac("sha256", process.env.AUTH_SECRET ?? "").update("stop:" + phone).digest("base64url").slice(0, 22);

/** A link in marketing messages that lets a customer stop them. */
export const stopToken = (phone: string) => `${phone}.${mac(phone)}`;
export const stopUrl = (phone: string) => `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/stop/${stopToken(phone)}`;

export function readStopToken(token: string): string | null {
  const [phone, sig] = token.split(".");
  if (!phone || !sig || !/^\d{10,15}$/.test(phone) || !process.env.AUTH_SECRET) return null;
  const a = Buffer.from(mac(phone));
  const b = Buffer.from(sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? phone : null;
}
