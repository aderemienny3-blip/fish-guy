import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { cleanEmail } from "@/lib/label-rules";

const COOKIE = "fg_label";
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_SENDS = 3;
const MAX_ATTEMPTS = 5;
const SESSION_DAYS = 7;

const secret = () => process.env.AUTH_SECRET ?? "";
const hashCode = (email: string, code: string) => crypto.createHmac("sha256", secret()).update(`label:${email}:${code}`).digest("hex");
const sign = (v: string) => crypto.createHmac("sha256", secret()).update("label-session:" + v).digest("base64url");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const adminEmails = () => (process.env.ADMIN_ALERT_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Same answer whether or not the email belongs to a label, so nobody can use this to find out who has an account. */
export async function sendLabelCode(rawEmail: string): Promise<{ ok: boolean; error?: string }> {
  const email = cleanEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { ok: false, error: "Enter a valid email address." };
  if (!secret()) return { ok: false, error: "Sign-in is not set up yet. Please contact Fish Guy." };
  const recent = await db.artistCode.count({ where: { email, createdAt: { gte: new Date(Date.now() - CODE_TTL_MS) } } });
  if (recent >= MAX_SENDS) return { ok: false, error: "Too many codes requested. Try again in a few minutes." };
  const member = await db.labelMember.findUnique({ where: { email }, select: { id: true } });
  if (!member) return { ok: true };

  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.artistCode.create({ data: { email, codeHash: hashCode(email, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) } });
  const sent = await sendEmail(
    email,
    `Your Fish Guy label code: ${code}`,
    `<div style="font-family:Arial,sans-serif;max-width:480px"><p style="color:#B8860B;letter-spacing:2px;font-size:13px;margin:0">FISH GUY SOUNDS FOR LABELS</p><h2 style="margin:8px 0">Your sign-in code</h2><p style="font-size:32px;letter-spacing:6px;font-weight:bold;margin:12px 0">${esc(code)}</p><p>It works for 10 minutes. If you did not ask for it, ignore this email.</p></div>`,
  );
  return sent ? { ok: true } : { ok: false, error: "We could not send the email right now. Please try again shortly." };
}

export async function verifyLabelCode(rawEmail: string, rawCode: string): Promise<boolean> {
  const email = cleanEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  if (code.length !== 6 || !secret()) return false;
  const row = await db.artistCode.findFirst({ where: { email, usedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!row || row.attempts >= MAX_ATTEMPTS) return false;
  const a = Buffer.from(row.codeHash);
  const b = Buffer.from(hashCode(email, code));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    await db.artistCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return false;
  }
  await db.artistCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });

  // The first successful code from the owner proves they control that company email. Then it waits for Fish Guy to approve.
  const member = await db.labelMember.findUnique({ where: { email }, include: { label: true } });
  if (!member) return false;
  if (member.role === "OWNER" && member.label.status === "UNVERIFIED") {
    await db.label.update({ where: { id: member.labelId }, data: { status: "PENDING", emailVerifiedAt: new Date() } });
    const to = adminEmails();
    if (to.length) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      await sendEmail(to, `New label to approve: ${member.label.name}`, `<p>${esc(member.label.name)} (${esc(email)}) confirmed their company email and wants a label account.</p><p><a href="${site}/admin/music/labels">Review it in admin</a>.</p>`).catch(() => false);
    }
  }
  await startLabelSession(email);
  return true;
}

export async function startLabelSession(email: string) {
  const body = Buffer.from(JSON.stringify({ e: email, x: Date.now() + SESSION_DAYS * 86_400_000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_DAYS * 86_400 });
}

export async function endLabelSession() {
  (await cookies()).delete(COOKIE);
}

async function getLabelEmail(): Promise<string | null> {
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

/** The signed-in label team member, their role and their label, or null. */
export async function getLabelAccess() {
  const email = await getLabelEmail();
  if (!email) return null;
  const member = await db.labelMember.findUnique({ where: { email }, include: { label: true } });
  return member ? { email, role: member.role, label: member.label } : null;
}
