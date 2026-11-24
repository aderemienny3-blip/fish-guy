import crypto from "node:crypto";

const secret = () => process.env.AUTH_SECRET ?? "";
const mac = (body: string) => crypto.createHmac("sha256", secret()).update("unsub:" + body).digest("base64url");

export function unsubToken(email: string, artistId: string) {
  const body = Buffer.from(`${email.toLowerCase()}\n${artistId}`).toString("base64url");
  return `${body}.${mac(body)}`;
}

export function readUnsubToken(token: string): { email: string; artistId: string } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !secret()) return null;
  const a = Buffer.from(mac(body));
  const b = Buffer.from(sig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [email, artistId] = Buffer.from(body, "base64url").toString().split("\n");
  return email && artistId ? { email, artistId } : null;
}
