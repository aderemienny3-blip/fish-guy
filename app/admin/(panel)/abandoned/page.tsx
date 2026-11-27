import Link from "next/link";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { abandonedOrders } from "@/lib/abandoned";
import { fmtDateTime } from "@/lib/admin/format";
import { waLink } from "@/lib/admin/whatsapp";
import { formatNaira } from "@/lib/money";
import { Empty, PageHeader, btnGhost, card, td, th } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function Abandoned() {
  await requireAdmin(MANAGERS);
  const rows = await abandonedOrders(14);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return (
    <>
      <PageHeader title="Unpaid orders" subtitle="People who started an order in the last 14 days, did not pay, and have not bought since." actions={<Link href="/admin/abandoned/export" className={btnGhost}>Download CSV</Link>} />
      {rows.length === 0 ? <Empty title="Nobody to follow up" hint="Orders that expire unpaid will appear here." /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-white/10"><tr><th className={th}>Customer</th><th className={th}>They wanted</th><th className={th}>Value</th><th className={th}>When</th><th className={th} /></tr></thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.phone}>
                  <td className={td}>{r.name}<p className="text-xs text-[#9A9585]">{r.phone}</p></td>
                  <td className={`${td} max-w-xs text-xs`}>{r.items}</td>
                  <td className={td}>{formatNaira(r.totalKobo)}</td>
                  <td className={`${td} text-xs text-[#9A9585]`}>{fmtDateTime(r.at)}</td>
                  <td className={td}>
                    <a className={btnGhost} target="_blank" rel="noreferrer" href={waLink(r.phone, `Hello ${r.name.trim().split(/\s+/)[0]}, this is Fish Guy. You started an order with us but it did not complete. Would you like us to help you finish it? ${site}/shop`)}>WhatsApp</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 max-w-3xl text-sm text-[#9A9585]">These people started an order themselves, so a single helpful message is reasonable. Use WhatsApp to ask if they had trouble paying. Do not message the same person again and again.</p>
    </>
  );
}
