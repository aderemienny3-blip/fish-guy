import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { COMPLAINT_KINDS, RESOLUTIONS, hoursSince } from "@/lib/complaints";
import { formatNaira } from "@/lib/money";
import { waLink } from "@/lib/admin/whatsapp";
import { Banner, Empty, PageHeader, btn, btnGhost, card, input } from "@/components/admin/ui";
import { resolveComplaint } from "./actions";

export const dynamic = "force-dynamic";

export default async function Complaints({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; all?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const rows = await db.complaint.findMany({
    where: q.all ? {} : { status: "OPEN" },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { order: { select: { reference: true, contactName: true, contactPhone: true, totalKobo: true, deliveredAt: true } } },
  });
  return (
    <>
      <PageHeader title="Complaints" subtitle="Problems customers reported after delivery. Resolve each one and the customer is told by email." actions={<Link href={q.all ? "/admin/complaints" : "/admin/complaints?all=1"} className={btnGhost}>{q.all ? "Open only" : "Show resolved too"}</Link>} />
      {q.saved && <Banner kind="ok">Saved.</Banner>}
      {q.error && <Banner>{q.error}</Banner>}
      {rows.length === 0 ? <Empty title={q.all ? "No complaints yet" : "No open complaints"} hint="Customers report problems from their order page after delivery." /> : (
        <div className="space-y-4">
          {rows.map((c) => {
            const h = hoursSince(c.order.deliveredAt, c.createdAt);
            return (
              <article key={c.id} className={`${card} space-y-3 p-5`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p><Link href={`/admin/orders/${c.order.reference}`} className="font-medium text-[#D4AF37] hover:underline">{c.order.reference}</Link> · {c.order.contactName} · {c.order.contactPhone}</p>
                  <p className="text-xs text-[#9A9585]">{fmtDateTime(c.createdAt)}{h !== null ? ` · ${h}h after delivery` : ""}</p>
                </div>
                <p className="text-sm"><strong>{COMPLAINT_KINDS[c.kind] ?? c.kind}</strong></p>
                <p className="whitespace-pre-wrap text-sm text-[#F5F1E6]">{c.message}</p>
                <p className="text-xs text-[#9A9585]">Order total {formatNaira(c.order.totalKobo)}</p>
                {c.status === "OPEN" ? (
                  <form action={resolveComplaint} className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-3">
                    <input type="hidden" name="id" value={c.id} />
                    <select name="resolution" defaultValue="" className="rounded-md border border-white/15 bg-[#0A0A0A] px-3 py-2 text-sm" required>
                      <option value="" disabled>How was it resolved?</option>
                      {Object.entries(RESOLUTIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    <input name="note" maxLength={500} placeholder="Note to the customer (optional)" className={`${input} min-w-[12rem] flex-1`} />
                    <button type="submit" className={btn}>Resolve</button>
                    <a href={waLink(c.order.contactPhone, `Hello ${c.order.contactName.split(/\s+/)[0]}, this is Fish Guy about your report on order ${c.order.reference}.`)} target="_blank" rel="noreferrer" className={btnGhost}>WhatsApp</a>
                    <p className="w-full text-xs text-[#9A9585]">A refund is paid back from your Paystack dashboard. Marking it here records the decision and tells the customer.</p>
                  </form>
                ) : (
                  <p className="border-t border-white/10 pt-3 text-sm text-emerald-300">Resolved by {c.resolvedBy ?? "staff"}: {RESOLUTIONS[c.resolution ?? ""] ?? c.resolution}{c.resolutionNote ? `. ${c.resolutionNote}` : ""}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
