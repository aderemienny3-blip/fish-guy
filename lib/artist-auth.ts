import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";

const COOKIE = "fg_artist";
const CODE_TTL_MS = 10 * 60 * 1000;
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_SENDS = 3;
const MAX_ATTEMPTS = 5;
const SESSION_DAYS = 7;

const secret = () => process.env.AUTH_SECRET ?? "";
const hashCode = (email: string, code: string) => crypto.createHmac("sha256", secret()).update(`artist:${email}:${code}`).digest("hex");
const sign = (v: string) => crypto.createHmac("sha256", secret()).update(v).digest("base64url");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const cleanEmail = (s: string) => s.trim().toLowerCase();

/** Always answers the same way, so nobody can use this to find out which emails are artists. */
export async function requestArtistCode(rawEmail: string): Promise<{ ok: boolean; error?: string }> {
  const email = cleanEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, error: "Enter a valid email address." };
  if (!secret()) return { ok: false, error: "Sign-in is not set up yet. Please contact Fish Guy." };

  const recent = await db.artistCode.count({ where: { email, createdAt: { gte: new Date(Date.now() - SEND_WINDOW_MS) } } });
  if (recent >= MAX_SENDS) return { ok: false, error: "Too many codes requested. Try again in a few minutes." };

  const artist = await db.artist.findFirst({ where: { email }, select: { id: true } });
  if (!artist) return { ok: true }; // looks the same as success

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.artistCode.create({ data: { email, codeHash: hashCode(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) } });
  const sent = await sendEmail(
    email,
    `Your Fish Guy artist code: ${code}`,
    `<div style="font-family:Arial,sans-serif;max-width:480px"><p style="color:#B8860B;letter-spacing:2px;font-size:13px;margin:0">FISH GUY SOUNDS</p><h2 style="margin:8px 0">Your sign-in code</h2><p style="font-size:32px;letter-spacing:6px;font-weight:bold;margin:12px 0">${esc(code)}</p><p>It works for 10 minutes. If you did not ask for it, ignore this email.</p></div>`,
  );
  if (!sent) return { ok: false, error: "We could not send the email right now. Please try again shortly." };
  return { ok: true };
}

export async function verifyArtistCode(rawEmail: string, rawCode: string): Promise<boolean> {
  const email = cleanEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6 || !secret()) return false;
  const row = await db.artistCode.findFirst({
    where: { email, usedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.attempts >= MAX_ATTEMPTS) return false;
  const a = Buffer.from(row.codeHash);
  const b = Buffer.from(hashCode(email, code));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) {
    await db.artistCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await db.artistCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  await startArtistSession(email);
  return true;
}

export async function startArtistSession(email: string) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const body = Buffer.from(JSON.stringify({ e: email, x: exp })).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endArtistSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in artist's email, or null. */
export async function getArtistEmail(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw || !secret()) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const want = Buffer.from(sign(body));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(body, "base64url").toString());
    return typeof e === "string" && typeof x === "number" && x > Date.now() ? e : null;
  } catch {
    return null;
  }
}
