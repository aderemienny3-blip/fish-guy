import crypto from "node:crypto";

export const COOKIE = "fg_admin";
export const SESSION_SECONDS = 12 * 60 * 60;

function key(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short. Set it in .env.local and in Vercel.");
  }
  return "fg-admin-session:" + s;
}

function mac(payload: string): string {
  return crypto.createHmac("sha256", key()).update(payload).digest("base64url");
}

export function signSession(uid: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid, exp: Date.now() + SESSION_SECONDS * 1000 })
  ).toString("base64url");
  return `${payload}.${mac(payload)}`;
}

export function verifySession(token: string): { uid: string } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(mac(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof d.uid !== "string" || typeof d.exp !== "number" || d.exp < Date.now()) return null;
    return { uid: d.uid };
  } catch {
    return null;
  }
}
