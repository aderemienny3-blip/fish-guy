import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { Empty, PageHeader, btnGhost, card, td, th } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function Messages({ searchParams }: { searchParams: Promise<{ channel?: string; failed?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const channel = q.channel === "EMAIL" || q.channel === "WHATSAPP" ? q.channel : undefined;
  const rows = await db.messageLog.findMany({ where: { ...(channel ? { channel } : {}), ...(q.failed ? { ok: false } : {}) }, orderBy: { createdAt: "desc" }, take: 200 });
  const href = (p: Record<string, string>) => "/admin/messages?" + new URLSearchParams(p).toString();

  return (
    <>
      <PageHeader title="Message log" subtitle="What was sent, to whom and when. The message text is not stored." actions={<><Link href="/admin/messages" className={btnGhost}>All</Link><Link href={href({ channel: "WHATSAPP" })} className={btnGhost}>WhatsApp</Link><Link href={href({ channel: "EMAIL" })} className={btnGhost}>Email</Link><Link href={href({ failed: "1" })} className={btnGhost}>Failed only</Link></>} />
      {rows.length === 0 ? <Empty title="No messages logged yet" hint="Messages appear here from the moment this kit is live." /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[760px]">
            <thead><tr><th className={th}>When</th><th className={th}>Channel</th><th className={th}>To</th><th className={th}>Kind</th><th className={th}>Result</th></tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-white/10">
                  <td className={td}>{fmtDateTime(m.createdAt)}</td>
                  <td className={td}>{m.channel === "EMAIL" ? "Email" : "WhatsApp"}</td>
                  <td className={`${td} break-all`}>{m.to}</td>
                  <td className={td}>{m.kind}{m.ref ? <span className="text-[#9A9585]"> · {m.ref}</span> : null}</td>
                  <td className={td}>{m.ok ? <span className="text-[#D4AF37]">Sent</span> : <span className="text-red-300">Failed{m.error ? `: ${m.error}` : ""}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
