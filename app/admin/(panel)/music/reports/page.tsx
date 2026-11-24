import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { reportRef } from "@/lib/copyright";
import { Banner, Empty, PageHeader, btnDanger, btnGhost, card, input, label } from "@/components/admin/ui";
import { dismissReport, takeDown } from "./actions";

export const dynamic = "force-dynamic";

export default async function Reports({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const reports = await db.takedownReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { track: { select: { slug: true, title: true, isPublished: true, artist: { select: { name: true, email: true } } } } },
  });
  const open = reports.filter((r) => r.status === "OPEN");
  const rest = reports.filter((r) => r.status !== "OPEN");

  const Card = ({ r }: { r: (typeof reports)[number] }) => (
    <div className={`${card} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-medium">{r.trackRef}</p>
          <p className="text-xs text-[#9A9585]">{reportRef(r.id)} · {fmtDateTime(r.createdAt)} · {r.status.toLowerCase()}</p>
        </div>
        {r.track && <p className="text-xs text-[#9A9585]">{r.track.isPublished ? "Live now" : "Offline"} · artist {r.track.artist.name}{r.track.artist.email ? ` (${r.track.artist.email})` : ""}</p>}
      </div>
      <p className="mt-3 text-sm"><b>From:</b> {r.reporterName} · <a className="text-[#D4AF37]" href={`mailto:${r.reporterEmail}`}>{r.reporterEmail}</a></p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm"><b>Their work and ownership:</b> {r.ownership}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm"><b>How it is used:</b> {r.description}</p>
      {r.proofUrl && <p className="mt-2 break-all text-sm"><b>Proof:</b> {r.proofUrl}</p>}
      <p className="mt-2 text-xs text-[#9A9585]">Signed: {r.signature}</p>
      {r.adminNote && <p className="mt-2 text-sm text-[#9A9585]">Your note: {r.adminNote}</p>}
      {r.status === "OPEN" && (
        <form className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <input type="hidden" name="id" value={r.id} />
          <div><label className={label}>Note (optional, kept for your records)</label><input name="note" className={input} maxLength={500} /></div>
          <div className="flex flex-wrap gap-2">
            <button formAction={takeDown} className={btnDanger}>Take track offline</button>
            <button formAction={dismissReport} className={btnGhost}>Dismiss report</button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="Copyright reports" subtitle="Taking a track offline hides it from sale at once. Tell the artist and the person who reported it what you decided."
        actions={<Link href="/admin/music" className={btnGhost}>Back to music</Link>} />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}
      {reports.length === 0 ? <Empty title="No reports" hint="Reports sent from the Report this track page appear here, and you get an email." /> : (
        <div className="space-y-3">
          {open.length > 0 && <h2 className="font-serif text-xl">Needs review ({open.length})</h2>}
          {open.map((r) => <Card key={r.id} r={r} />)}
          {rest.length > 0 && <h2 className="pt-4 font-serif text-xl">Handled</h2>}
          {rest.map((r) => <Card key={r.id} r={r} />)}
        </div>
      )}
    </>
  );
}
