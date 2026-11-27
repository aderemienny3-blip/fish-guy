import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const adminList = () => (process.env.ADMIN_ALERT_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Errors that are normal control flow in Next.js, not problems. */
export const isRoutine = (err: unknown) => /NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK|DYNAMIC_SERVER_USAGE|Dynamic server usage/.test(err instanceof Error ? `${err.message} ${(err as { digest?: string }).digest ?? ""}` : String(err));

/** Emails the owner when something breaks on the server. One email per place every 30 minutes, so a bad deploy cannot flood the inbox. Never throws. */
export async function alertAdmin(where: string, err: unknown) {
  try {
    const to = adminList();
    if (to.length === 0 || isRoutine(err)) return;
    const subject = `Fish Guy error: ${where}`.slice(0, 120);
    const recent = await db.messageLog.findFirst({ where: { kind: subject, createdAt: { gte: new Date(Date.now() - 30 * 60_000) } }, select: { id: true } });
    if (recent) return;
    const msg = (err instanceof Error ? err.message : String(err)).slice(0, 300);
    await sendEmail(to, subject, `<p>Something went wrong on the site.</p><p><strong>${esc(where)}</strong></p><p>${esc(msg)}</p><p>Time: ${new Date().toISOString()}. Check the logs in Vercel for details.</p>`);
  } catch (e) {
    console.error("alert failed", e);
  }
}

/** Sends a test alert right now, to prove the email setup works. Returns whether an email went out. */
export async function sendTestAlert() {
  const to = adminList();
  if (to.length === 0) return false;
  return sendEmail(to, "Fish Guy test alert", "<p>This is a test. If you can read this, error alerts will reach you.</p>");
}
