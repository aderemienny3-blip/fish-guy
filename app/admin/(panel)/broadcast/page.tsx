import Link from "next/link";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { SEGMENTS, SEGMENT_LABEL } from "@/lib/admin/segments";
import { Banner, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { whatsappConfigured } from "@/lib/whatsapp";
import { BROADCAST_TEMPLATE, MAX_PER_SEND, broadcastRecipients } from "@/lib/broadcast";
import { sendBroadcast } from "./actions";

export const dynamic = "force-dynamic";

export default async function Broadcast({ searchParams }: { searchParams: Promise<{ segment?: string; sent?: string; failed?: string; left?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const seg = SEGMENTS.includes(q.segment as never) ? q.segment! : "";
  const r = await broadcastRecipients(seg || null);

  return (
    <>
      <PageHeader title="Send an offer by WhatsApp" subtitle="Only to customers who agreed to offers at checkout, grouped by how they buy." actions={<Link href="/admin/customers" className={btnGhost}>Customers</Link>} />
      {q.sent !== undefined && <Banner kind="ok">Sent to {q.sent} customer{q.sent === "1" ? "" : "s"}{Number(q.failed) > 0 ? `, ${q.failed} failed (see Messages)` : ""}.{Number(q.left) > 0 ? ` ${q.left} more are waiting. Send again for the next batch.` : ""}</Banner>}
      {q.error && <Banner>{q.error}</Banner>}
      {!whatsappConfigured() && <Banner>WhatsApp is not set up yet, so nothing can be sent.</Banner>}
      <form method="get" className="mb-4 flex max-w-xl gap-2">
        <select name="segment" defaultValue={seg} className={input}>
          <option value="">All customers who agreed</option>
          {SEGMENTS.map((s) => <option key={s} value={s}>{SEGMENT_LABEL[s]}</option>)}
        </select>
        <button className={btnGhost}>Check who</button>
      </form>
      <p className="mb-4 text-sm text-[#9A9585]">{r.consenting} of {r.total} customers in this group agreed to offers. {r.recipients.length} can be messaged now (anyone messaged in the last 12 hours is skipped). At most {MAX_PER_SEND} go in one send.</p>
      <form action={sendBroadcast} className={`${card} max-w-2xl space-y-4 p-6`}>
        <input type="hidden" name="segment" value={seg} />
        <div><label className={label}>Message</label><textarea name="message" rows={4} maxLength={300} required className={input} placeholder="Fresh tilapia is back in stock. Order before Friday and get free delivery in Lekki." /></div>
        <p className="text-xs text-[#9A9585]">Customers see: &quot;Hi [first name], [your message]&quot;. It is sent with your approved template <strong>{BROADCAST_TEMPLATE()}</strong>. The template should end with &quot;Reply STOP to opt out.&quot;</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" value="yes" className="mt-1" /> Send to {r.recipients.length > MAX_PER_SEND ? MAX_PER_SEND : r.recipients.length} customer{r.recipients.length === 1 ? "" : "s"} now</label>
        <button className={btn} disabled={r.recipients.length === 0}>Send</button>
      </form>
    </>
  );
}
