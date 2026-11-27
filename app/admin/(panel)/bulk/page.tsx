import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { waLink } from "@/lib/admin/whatsapp";
import { Banner, Empty, PageHeader, btn, btnGhost, card, input } from "@/components/admin/ui";
import { QUOTE_LABEL, QUOTE_STATUS } from "@/lib/bulk";
import { updateQuote } from "./actions";

export const dynamic = "force-dynamic";

export default async function BulkAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; all?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const rows = await db.bulkQuote.findMany({ where: q.all ? {} : { status: { in: ["NEW", "QUOTED"] } }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageHeader title="Bulk and event requests" subtitle="Restaurants, caterers and events asking for a price. Reply on WhatsApp, then record what happened." actions={<Link href={q.all ? "/admin/bulk" : "/admin/bulk?all=1"} className={btnGhost}>{q.all ? "Open only" : "Show won and lost too"}</Link>} />
      {q.saved && <Banner kind="ok">Saved.</Banner>}
      {rows.length === 0 ? <Empty title="No requests" hint="Requests from the Bulk and event orders page appear here." /> : (
        <div className="space-y-4">
          {rows.map((r) => (
            <article key={r.id} className={`${card} space-y-3 p-5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{r.name}{r.business ? ` · ${r.business}` : ""} <span className="text-sm text-[#9A9585]">· {r.phone}</span></p>
                <p className="text-xs text-[#9A9585]">{fmtDateTime(r.createdAt)}</p>
              </div>
              <p className="whitespace-pre-wrap text-sm">{r.items}</p>
              <p className="text-xs text-[#9A9585]">{r.area ? `Area: ${r.area}` : "No area given"}{r.neededBy ? ` · Needed by: ${r.neededBy}` : ""}</p>
              <form action={updateQuote} className="flex flex-wrap items-end gap-2 border-t border-white/10 pt-3">
                <input type="hidden" name="id" value={r.id} />
                <select name="status" defaultValue={r.status} className="rounded-md border border-white/15 bg-[#0A0A0A] px-3 py-2 text-sm">{QUOTE_STATUS.map((s) => <option key={s} value={s}>{QUOTE_LABEL[s]}</option>)}</select>
                <input name="note" defaultValue={r.note ?? ""} maxLength={500} placeholder="Note (price quoted, follow-up date)" className={`${input} min-w-[12rem] flex-1`} />
                <button type="submit" className={btn}>Save</button>
                <a href={waLink(r.phone, `Hello ${r.name.trim().split(/\s+/)[0]}, this is Fish Guy about your request for a bulk price.`)} target="_blank" rel="noreferrer" className={btnGhost}>WhatsApp</a>
              </form>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
