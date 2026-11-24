import { db } from "@/lib/db";
import { getFanList } from "@/lib/artist-stats";
import { unsubToken } from "@/lib/unsub";

export const MAX_RECIPIENTS = 500;
export const MAX_PER_WEEK = 2;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Fans who may be emailed: they did not keep their email private, did not unsubscribe, and match the audience. */
export async function recipientsFor(artistId: string, audience: string) {
  const [fans, unsub] = await Promise.all([
    getFanList(artistId),
    db.fanUnsubscribe.findMany({ where: { artistId }, select: { email: true } }),
  ]);
  const gone = new Set(unsub.map((u) => u.email.toLowerCase()));
  return fans
    .filter((f) => f.email && !gone.has(f.email) && (audience !== "SUPERFANS" || f.tier === "Superfan"))
    .map((f) => ({ email: f.email as string, name: f.name }));
}

function html(a: { subject: string; body: string; linkUrl: string | null }, artistName: string, unsubUrl: string) {
  const paras = a.body.split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.55">${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const button = a.linkUrl
    ? `<p style="margin:20px 0"><a href="${esc(a.linkUrl)}" style="background:#D4AF37;color:#0A0A0A;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Open the link</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#0A0A0A;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#F5F1E6">
<div style="max-width:560px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:28px">
<p style="margin:0 0 4px;color:#D4AF37;font-size:13px;letter-spacing:2px">FISH GUY SOUNDS</p>
<h1 style="margin:0 0 16px;font-size:22px">${esc(a.subject)}</h1>${paras}${button}
<hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0">
<p style="margin:0;font-size:12px;color:#9A9585;line-height:1.5">You are getting this because you bought music by ${esc(artistName)} on Fish Guy Sounds and did not keep your email private. <a href="${esc(unsubUrl)}" style="color:#D4AF37">Stop emails from ${esc(artistName)}</a>.</p>
</div></body></html>`;
}

/** Sends an approved announcement. Returns how many emails were accepted by the mail service. */
export async function sendAnnouncement(id: string): Promise<{ ok: boolean; sent: number; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!key) return { ok: false, sent: 0, error: "Email is not set up (RESEND_API_KEY is missing)." };
  if (!site) return { ok: false, sent: 0, error: "NEXT_PUBLIC_SITE_URL is missing, so unsubscribe links would be broken." };

  const a = await db.fanAnnouncement.findUnique({ where: { id }, include: { artist: { select: { id: true, name: true } } } });
  if (!a) return { ok: false, sent: 0, error: "Announcement not found." };
  const to = await recipientsFor(a.artistId, a.audience);
  if (to.length === 0) return { ok: false, sent: 0, error: "There is nobody to send this to yet." };
  if (to.length > MAX_RECIPIENTS) return { ok: false, sent: 0, error: `That is ${to.length} people. The limit is ${MAX_RECIPIENTS} per announcement.` };

  const from = process.env.NOTIFY_FROM || "Fish Guy <onboarding@resend.dev>";
  const subject = `${a.artist.name}: ${a.subject}`.slice(0, 160);
  let sent = 0;
  for (let i = 0; i < to.length; i += 100) {
    const chunk = to.slice(i, i + 100).map((r) => {
      const url = `${site.replace(/\/$/, "")}/unsubscribe/${unsubToken(r.email, a.artistId)}`;
      return { from, to: [r.email], subject, html: html(a, a.artist.name, url), headers: { "List-Unsubscribe": `<${url}>` } };
    });
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return { ok: sent > 0, sent, error: `The mail service refused a batch (${res.status}). ${sent} sent before that.` };
      sent += chunk.length;
    } catch {
      return { ok: sent > 0, sent, error: `The mail service did not answer. ${sent} sent before that.` };
    }
  }
  return { ok: true, sent };
}
