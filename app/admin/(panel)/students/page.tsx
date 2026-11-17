import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { formatNaira } from "@/lib/money";
import { Banner, Empty, PageHeader, Stat, btn, btnDanger, btnGhost, card, input } from "@/components/admin/ui";
import { getStudentRules } from "@/lib/student";
import { approveStudent, rejectStudent, revokeStudent } from "./actions";

export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const now = new Date();
  const [rules, pending, active, past, usage] = await Promise.all([
    getStudentRules(),
    db.studentVerification.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { institution: true } }),
    db.studentVerification.findMany({ where: { status: "APPROVED", expiresAt: { gt: now } }, orderBy: { approvedAt: "desc" }, take: 100, include: { institution: true } }),
    db.studentVerification.findMany({ where: { OR: [{ status: { in: ["REJECTED", "REVOKED"] } }, { status: "APPROVED", expiresAt: { lte: now } }] }, orderBy: { createdAt: "desc" }, take: 30, include: { institution: true } }),
    db.order.aggregate({ where: { studentVerificationId: { not: null }, status: { in: ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] } }, _count: true, _sum: { discountKobo: true } }),
  ]);
  const school = (v: { institution: { name: string } | null; otherInstitution: string | null }) => v.institution?.name ?? `${v.otherInstitution} (not on list)`;

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={rules.percent > 0 ? `Discount is ON: ${rules.percent}% off food.` : "Discount is OFF. Set a percentage in Settings to open it to students."}
        actions={<><Link href="/admin/students/institutions" className={btnGhost}>Schools list</Link><Link href="/admin/settings" className={btnGhost}>Settings</Link></>}
      />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Verified students" value={active.length} />
        <Stat label="Paid orders with discount" value={usage._count} />
        <Stat label="Total discount given" value={formatNaira(usage._sum.discountKobo ?? 0)} />
      </div>

      <h2 className="mb-3 font-serif text-xl">Waiting for review ({pending.length})</h2>
      {pending.length === 0 ? (
        <Empty title="Nothing to review" hint="New student applications appear here, oldest first." />
      ) : (
        <div className="space-y-4">
          {pending.map((v) => (
            <div key={v.id} className={`${card} grid gap-4 p-5 md:grid-cols-[240px_1fr]`}>
              {v.idPath ? (
                <a href={`/api/admin/student-id/${v.id}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/admin/student-id/${v.id}`} alt={`ID of ${v.fullName}`} className="max-h-60 w-full rounded-md border border-white/10 object-contain" />
                </a>
              ) : <p className="text-sm text-[#9A9585]">No ID photo.</p>}
              <div>
                <p className="text-lg font-medium">{v.fullName}</p>
                <p className="text-sm">{school(v)}</p>
                <p className="text-sm text-[#9A9585]">Matric: {v.matricNumber} · {v.phone} · {v.email}</p>
                <p className="text-xs text-[#9A9585]">Applied {fmtDateTime(v.createdAt)}</p>
                <div className="mt-4 flex flex-wrap items-start gap-3">
                  <form action={approveStudent}><input type="hidden" name="id" value={v.id} /><button className={btn}>Approve</button></form>
                  <form action={rejectStudent} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={v.id} />
                    <input name="reason" placeholder="Reason (shown to student)" className={`${input} w-64`} required minLength={3} maxLength={300} />
                    <button className={btnDanger}>Reject</button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 font-serif text-xl">Verified now ({active.length})</h2>
      {active.length === 0 ? <Empty title="No verified students yet" /> : (
        <div className="space-y-2">
          {active.map((v) => (
            <div key={v.id} className={`${card} flex flex-wrap items-center justify-between gap-3 px-5 py-3`}>
              <div>
                <p className="font-medium">{v.fullName} <span className="text-xs text-[#9A9585]">· {v.phone}</span></p>
                <p className="text-xs text-[#9A9585]">{school(v)} · until {v.expiresAt ? fmtDateTime(v.expiresAt) : ""}</p>
              </div>
              <form action={revokeStudent}><input type="hidden" name="id" value={v.id} /><button className={btnDanger}>Revoke</button></form>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 font-serif text-xl">Past applications</h2>
          <div className="space-y-2">
            {past.map((v) => (
              <div key={v.id} className={`${card} px-5 py-3 text-sm`}>
                <span className="font-medium">{v.fullName}</span> <span className="text-[#9A9585]">· {school(v)} · {v.status === "APPROVED" ? "expired" : v.status.toLowerCase()}{v.rejectReason ? ` · ${v.rejectReason}` : ""}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
