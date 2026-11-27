import { db } from "@/lib/db";
import { OWNER_ONLY, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { Empty, PageHeader, card, td, th } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin(OWNER_ONLY);
  const rows = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 300 });
  return (
    <>
      <PageHeader title="Activity log" subtitle="Who changed what in admin. Newest first, last 300 entries." />
      {rows.length === 0 ? <Empty title="Nothing recorded yet" hint="Order moves, rider assignments, deliveries, cost changes, ad spend and complaint decisions are recorded from now on." /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-white/10"><tr><th className={th}>When</th><th className={th}>Who</th><th className={th}>What</th><th className={th}>On</th><th className={th}>Detail</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.id}><td className={`${td} whitespace-nowrap text-xs text-[#9A9585]`}>{fmtDateTime(r.createdAt)}</td><td className={td}>{r.adminName}</td><td className={td}>{r.action}</td><td className={td}>{r.target}</td><td className={`${td} text-xs text-[#9A9585]`}>{r.detail ?? ""}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
