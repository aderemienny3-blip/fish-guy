// Self-contained emails for Fish Guy Ads (Resend). Never throws. Needs RESEND_API_KEY; alerts go to ADMIN_ALERT_EMAIL.
import { formatNaira } from "@/lib/money";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const site = () => process.env.NEXT_PUBLIC_SITE_URL || "";
const admins = () => (process.env.ADMIN_ALERT_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);

async function send(to: string | string[], subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const list = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (!key || !list.length) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.NOTIFY_FROM || "Fish Guy <onboarding@resend.dev>", to: list, subject, html }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) console.error("ad email failed", res.status);
  } catch (e) {
    console.error("ad email error", e);
  }
}

const shell = (title: string, body: string) =>
  `<!doctype html><html><body style="margin:0;background:#0A0A0A;padding:24px;font-family:Arial,sans-serif;color:#F5F1E6"><div style="max-width:560px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:28px"><p style="margin:0 0 4px;color:#D4AF37;font-size:13px;letter-spacing:2px">FISH GUY ADS</p><h1 style="margin:0 0 16px;font-size:22px">${esc(title)}</h1>${body}</div></body></html>`;
const btn = (href: string, label: string) => `<p style="margin:22px 0 0"><a href="${href}" style="background:#D4AF37;color:#000;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">${label}</a></p>`;

type C = { reference: string; artistName: string; contactName: string; email: string; packageName: string; priceKobo: number; startDate: string; endDate: string; headline: string };
const first = (n: string) => esc(n.trim().split(/\s+/)[0] || "there");

export async function mailSubmitted(c: C) {
  const link = site() ? `${site()}/advertise/${c.reference}` : "";
  await Promise.all([
    send(c.email, `We received your ad ${c.reference}`, shell("We received your ad", `<p>Hi ${first(c.contactName)}, thanks for booking <strong>${esc(c.packageName)}</strong> for ${esc(c.artistName)}. We review every ad before it goes live. You pay only after it is approved, and we will email you.</p>${link ? btn(link, "Check your ad status") : ""}`)),
    send(admins(), `Ad to review: ${c.artistName} (${c.packageName})`, shell("New ad to review", `<p><strong>${esc(c.artistName)}</strong> · ${esc(c.packageName)} · ${formatNaira(c.priceKobo)}</p><p style="color:#cfc9b6">“${esc(c.headline)}”<br>${esc(c.startDate)} to ${esc(c.endDate)}</p>${site() ? btn(`${site()}/admin/ads`, "Open review queue") : ""}`)),
  ]);
}

export async function mailApproved(c: C) {
  const link = site() ? `${site()}/advertise/${c.reference}` : "";
  await send(c.email, `Your ad is approved. Pay to book it`, shell("Your ad is approved", `<p>Hi ${first(c.contactName)}, your <strong>${esc(c.packageName)}</strong> ad is approved. Pay ${formatNaira(c.priceKobo)} to lock in your dates (${esc(c.startDate)} to ${esc(c.endDate)}). If your start date passes before you pay, the dates move to start on payment day.</p>${link ? btn(link, "Pay now") : ""}`));
}

export async function mailRejected(c: C, reason: string) {
  const link = site() ? `${site()}/advertise` : "";
  await send(c.email, `About your Fish Guy ad ${c.reference}`, shell("We could not approve this ad", `<p>Hi ${first(c.contactName)}, we could not approve your ad.</p><p style="color:#cfc9b6">Reason: ${esc(reason)}</p><p>You have not been charged. You are welcome to submit a new one.</p>${link ? btn(link, "Book a new ad") : ""}`));
}

export async function mailPaid(c: C) {
  const link = site() ? `${site()}/advertise/${c.reference}` : "";
  await Promise.all([
    send(c.email, `Payment received. Your ad is booked`, shell("Your ad is booked", `<p>Hi ${first(c.contactName)}, we received ${formatNaira(c.priceKobo)}. Your <strong>${esc(c.packageName)}</strong> runs from ${esc(c.startDate)} to ${esc(c.endDate)}. Real numbers appear on your status page while it runs.</p>${link ? btn(link, "View your ad page") : ""}`)),
    send(admins(), `Ad paid: ${c.artistName} (${c.packageName})`, shell("Ad paid and booked", `<p><strong>${esc(c.artistName)}</strong> · ${esc(c.packageName)} · ${formatNaira(c.priceKobo)}<br>${esc(c.startDate)} to ${esc(c.endDate)}</p>${site() ? btn(`${site()}/admin/ads`, "Open ads") : ""}`)),
  ]);
}
