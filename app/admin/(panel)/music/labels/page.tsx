import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { daysLeft, isLabelActive } from "@/lib/label-rules";
import { Banner, Empty, PageHeader, btn, btnGhost, card, input } from "@/components/admin/ui";
import { addYear, approveLabel, rejectLabel } from "./actions";

export const dynamic = "force-dynamic";

const ORDER = { PENDING: 0, APPROVED: 1, UNVERIFIED: 2, REJECTED: 3 } as const;

export default async function Labels({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved } = await searchParams;
  const labels = await db.label.findMany({ include: { _count: { select: { artists: true, members: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  labels.sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return (
    <>
      <PageHeader title="Label accounts" subtitle="Labels confirm a company email, you approve them, then they pay the yearly fee." actions={<Link href="/admin/music" className={btnGhost}>Back to music</Link>} />
      {saved && <Banner kind="ok">Done.</Banner>}
      {labels.length === 0 ? <Empty title="No labels yet" hint="Labels that sign up at /label/apply appear here." /> : (
        <div className="space-y-3">
          {labels.map((l) => (
            <div key={l.id} className={`${card} space-y-3 p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{l.name} <span className="text-xs text-[#9A9585]">· {l.ownerEmail}</span></p>
                  <p className="text-xs text-[#9A9585]">
                    {l.status === "UNVERIFIED" ? "Has not confirmed their email" : l.status === "PENDING" ? "Waiting for your approval" : l.status === "REJECTED" ? "Rejected" : isLabelActive(l) ? `Active until ${fmtDateTime(l.paidUntil!)} (${daysLeft(l.paidUntil)} days)` : l.paidUntil ? `Expired ${fmtDateTime(l.paidUntil)}` : "Approved, not paid yet"}
                    {" · "}{l._count.artists} artists · {l._count.members} team
                  </p>
                </div>
                {l.status === "APPROVED" && <form action={addYear}><input type="hidden" name="id" value={l.id} /><button className={btnGhost}>Mark paid by transfer (+12 months)</button></form>}
              </div>
              {l.status === "PENDING" && (
                <div className="flex flex-wrap items-end gap-3">
                  <form action={approveLabel}><input type="hidden" name="id" value={l.id} /><button className={btn}>Approve</button></form>
                  <form action={rejectLabel} className="flex items-end gap-2"><input type="hidden" name="id" value={l.id} /><input name="note" placeholder="Reason (optional, they will see it)" className={input} maxLength={300} /><button className={btnGhost}>Reject</button></form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
