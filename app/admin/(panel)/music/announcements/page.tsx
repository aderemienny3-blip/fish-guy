import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { recipientsFor } from "@/lib/announce";
import { Banner, Empty, PageHeader, btn, btnDanger, btnGhost, card, input, label } from "@/components/admin/ui";
import { approveAnnouncement, rejectAnnouncement } from "./actions";

export const dynamic = "force-dynamic";

export default async function Announcements({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const rows = await db.fanAnnouncement.findMany({ orderBy: { createdAt: "desc" }, take: 60, include: { artist: { select: { name: true } } } });
  const pending = rows.filter((r) => r.status === "PENDING");
  const counts = new Map(await Promise.all(pending.map(async (r) => [r.id, (await recipientsFor(r.artistId, r.audience)).length] as const)));
  const rest = rows.filter((r) => r.status !== "PENDING");

  return (
    <>
      <PageHeader title="Fan announcements" subtitle="Artists write these. Nothing is emailed until you approve it. Check it is honest, on topic and not spam."
        actions={<Link href="/admin/music" className={btnGhost}>Back to music</Link>} />
      {saved && <Banner kind="ok">Done.</Banner>}
      {error && <Banner>{error}</Banner>}
      {rows.length === 0 ? <Empty title="No announcements" hint="When an artist writes one from their dashboard, it appears here." /> : (
        <div className="space-y-3">
          {pending.length > 0 && <h2 className="font-serif text-xl">Needs review ({pending.length})</h2>}
          {pending.map((r) => (
            <div key={r.id} className={`${card} p-5`}>
              <p className="text-lg font-medium">{r.subject}</p>
              <p className="text-xs text-[#9A9585]">{r.artist.name} · {fmtDateTime(r.createdAt)} · to {r.audience === "SUPERFANS" ? "Superfans only" : "all fans who allowed email"} · {counts.get(r.id) ?? 0} people</p>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm">{r.body}</p>
              {r.linkUrl && <p className="mt-2 break-all text-sm text-[#D4AF37]">{r.linkUrl}</p>}
              {r.reviewNote && <p className="mt-2 text-sm text-[#9A9585]">Last attempt: {r.reviewNote}</p>}
              <form className="mt-4 space-y-3 border-t border-white/10 pt-4">
                <input type="hidden" name="id" value={r.id} />
                <div><label className={label}>Reason, if rejecting (the artist sees it)</label><input name="note" className={input} maxLength={300} /></div>
                <div className="flex gap-2">
                  <button formAction={approveAnnouncement} className={btn}>Approve and send</button>
                  <button formAction={rejectAnnouncement} className={btnDanger}>Reject</button>
                </div>
              </form>
            </div>
          ))}
          {rest.length > 0 && <h2 className="pt-4 font-serif text-xl">History</h2>}
          {rest.map((r) => (
            <div key={r.id} className={`${card} p-4`}>
              <p className="font-medium">{r.subject} <span className="text-xs text-[#9A9585]">· {r.status.toLowerCase()}{r.status === "SENT" ? ` to ${r.recipientCount}` : ""}</span></p>
              <p className="text-xs text-[#9A9585]">{r.artist.name} · {fmtDateTime(r.sentAt ?? r.createdAt)}{r.reviewNote ? ` · ${r.reviewNote}` : ""}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
