import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { MAX_DOWNLOADS } from "@/lib/music/download-limits";
import { Banner, Empty, PageHeader, btnGhost, card } from "@/components/admin/ui";
import { resetDownloads } from "./actions";

export const dynamic = "force-dynamic";

export default async function Downloads({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved } = await searchParams;
  const since = new Date(Date.now() - 30 * 86_400_000);
  const links = await db.musicDownloadLink.findMany({
    where: { usedAt: { gte: since } },
    orderBy: { usedAt: "desc" },
    take: 3000,
    select: {
      orderItemId: true, format: true, usedAt: true, country: true,
      orderItem: { select: { downloadsFrom: true, track: { select: { title: true } }, order: { select: { buyerName: true, buyerEmail: true } } } },
    },
  });

  const by = new Map<string, { title: string; buyer: string; email: string; mp3: number; wav: number; total: number; last: Date | null; countries: Set<string> }>();
  for (const l of links) {
    const row = by.get(l.orderItemId) ?? { title: l.orderItem.track.title, buyer: l.orderItem.order.buyerName, email: l.orderItem.order.buyerEmail, mp3: 0, wav: 0, total: 0, last: null, countries: new Set<string>() };
    row.total++;
    if (!l.usedAt || !l.orderItem.downloadsFrom || l.usedAt >= l.orderItem.downloadsFrom) { if (l.format === "wav") row.wav++; else row.mp3++; }
    if (l.country) row.countries.add(l.country);
    if (!row.last || (l.usedAt && l.usedAt > row.last)) row.last = l.usedAt;
    by.set(l.orderItemId, row);
  }
  const rows = [...by.entries()]
    .map(([id, r]) => ({ id, ...r, atLimit: r.mp3 >= MAX_DOWNLOADS || r.wav >= MAX_DOWNLOADS, spread: r.countries.size >= 3 }))
    .sort((a, b) => Number(b.atLimit || b.spread) - Number(a.atLimit || a.spread) || b.total - a.total)
    .slice(0, 60);

  return (
    <>
      <PageHeader title="Downloads" subtitle={`Each purchase gets ${MAX_DOWNLOADS} downloads per file type. Buyers at the limit, or downloading from 3 or more countries, are listed first.`}
        actions={<Link href="/admin/music" className={btnGhost}>Back to music</Link>} />
      {saved && <Banner kind="ok">The buyer has fresh downloads.</Banner>}
      {rows.length === 0 ? <Empty title="No downloads yet" hint="Downloads from the last 30 days appear here." /> : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
              <div>
                <p className="font-medium">{r.title} <span className="text-xs text-[#9A9585]">· {r.buyer} · {r.email}</span></p>
                <p className="text-xs text-[#9A9585]">MP3 {r.mp3}/{MAX_DOWNLOADS} · WAV {r.wav}/{MAX_DOWNLOADS} · last {r.last ? fmtDateTime(r.last) : ""} · from {[...r.countries].join(", ") || "unknown"}
                  {r.atLimit ? " · LIMIT REACHED" : ""}{r.spread ? " · MANY COUNTRIES, may be shared" : ""}</p>
              </div>
              <form action={resetDownloads}><input type="hidden" name="id" value={r.id} /><button className={btnGhost}>Give {MAX_DOWNLOADS} more</button></form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
