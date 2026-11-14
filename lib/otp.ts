import crypto from "node:crypto";
import { db } from "@/lib/db";
import { normalizeNgPhone } from "@/lib/phone";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hash(phone: string, code: string) {
  return crypto
    .createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(`${phone}:${code}`)
    .digest("hex");
}

async function sendSms(to: string, message: string) {
  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      from: process.env.TERMII_SENDER_ID,
      sms: message,
      type: "plain",
      channel: process.env.TERMII_CHANNEL ?? "dnd",
      api_key: process.env.TERMII_API_KEY,
    }),
  });
  if (!res.ok) throw new Error(`SMS send failed (${res.status})`);
}

export async function requestOtp(rawPhone: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const phone = normalizeNgPhone(rawPhone);
  if (!phone) return { ok: false, error: "Enter a valid Nigerian phone number." };

  const recent = await db.otpCode.count({
    where: { phone, createdAt: { gte: new Date(Date.now() - SEND_WINDOW_MS) } },
  });
  if (recent >= MAX_SENDS_PER_WINDOW) {
    return { ok: false, error: "Too many codes requested. Try again in a few minutes." };
  }

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.otpCode.create({
    data: { phone, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });
  await sendSms(phone, `Your Fish Guy code is ${code}. It expires in 5 minutes.`);
  return { ok: true };
}

/** Returns the normalised phone if the code is valid, else null. */
export async function verifyOtp(rawPhone: string, code: string): Promise<string | null> {
  const phone = normalizeNgPhone(rawPhone);
  if (!phone || !/^\d{6}$/.test(code)) return null;

  const row = await db.otpCode.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.attempts >= MAX_ATTEMPTS) return null;

  const a = Buffer.from(row.codeHash);
  const b = Buffer.from(hash(phone, code));
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) {
    await db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return null;
  }
  await db.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  return phone;
}
