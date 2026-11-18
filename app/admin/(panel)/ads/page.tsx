import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { formatNaira } from "@/lib/money";
import { Banner, Empty, PageHeader, Stat, btn, btnDanger, btnGhost, card, input } from "@/components/admin/ui";
import { PLACEMENT_INFO, type Placement } from "@/lib/ads/labels";
import { adImageSrc } from "@/lib/ads/data";
import { lagosNow } from "@/lib/delivery";
import { approveAd, rejectAd } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdsAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const today = lagosNow().date;

  const [queue, waiting, running, past, revenue] = await Promise.all([
    db.adCampaign.findMany({ where: { status: "SUBMITTED" }, orderBy: { createdAt: "asc" } }),
    db.adCampaign.findMany({ where: { status: "APPROVED" }, orderBy: { reviewedAt: "asc" } }),
    db.adCampaign.findMany({ where: { status: "PAID", endDate: { gte: today } }, orderBy: { startDate: "asc" } }),
    db.adCampaign.findMany({ where: { OR: [{ status: "PAID", endDate: { lt: today } }, { status: { in: ["REJECTED", "CANCELLED"] } }] }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.adCampaign.aggregate({ where: { status: "PAID" }, _sum: { priceKobo: true }, _count: true }),
  ]);
  const ids = running.map((c) => c.id);
  const events = ids.length ? await db.adEvent.groupBy({ by: ["campaignId", "type"], where: { campaignId: { in: ids } }, _count: true }) : [];
  const num = (id: string, t: "IMPRESSION" | "CLICK") => events.find((e) => e.campaignId === id && e.type === t)?._count ?? 0;
  const liveNow = running.filter((c) => c.startDate <= today).length;

  return (
    <>
      <PageHeader title="Ads" subtitle="Artist ads: review, approve, and see what is running." actions={<Link href="/admin/ads/packages" className={btnGhost}>Packages and prices</Link>} />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="To review" value={queue.length} />
        <Stat label="Live now" value={liveNow} />
        <Stat label="Paid campaigns" value={revenue._count} />
        <Stat label="Ad revenue" value={formatNaira(revenue._sum.priceKobo ?? 0)} />
      </div>

      <h2 className="mb-3 font-serif text-xl">Waiting for review ({queue.length})</h2>
      {queue.length === 0 ? <Empty title="Nothing to review" hint="New ads appear here, oldest first. Check the artwork and link before approving." /> : (
        <div className="space-y-4">
          {queue.map((c) => {
            const img = adImageSrc(c.imagePath);
            return (
              <div key={c.id} className={`${card} grid gap-4 p-5 md:grid-cols-[200px_1fr]`}>
                {img ? /* eslint-disable-next-line @next/next/no-img-element */ <a href={img} target="_blank" rel="noreferrer"><img src={img} alt="" className="max-h-52 w-full rounded-md border border-white/10 object-contain" /></a> : <p className="text-sm text-[#9A9585]">No image.</p>}
                <div>
                  <p className="text-lg font-medium">{c.artistName}: “{c.headline}”</p>
                  {c.tagline && <p className="text-sm text-[#cfc9b6]">{c.tagline}</p>}
                  <p className="mt-1 text-sm">{c.packageName} · {PLACEMENT_INFO[c.placement as Placement].label} · {formatNaira(c.priceKobo)}</p>
                  <p className="text-sm text-[#9A9585]">{c.startDate} to {c.endDate} · {c.contactName} · {c.phone} · {c.email}</p>
                  <p className="break-all text-sm">Goes to: {c.linkUrl ? <a href={c.linkUrl} target="_blank" rel="noreferrer" className="text-[#D4AF37] underline">{c.linkUrl}</a> : "a track on Fish Guy Sounds"}</p>
                  <p className="text-xs text-[#9A9585]">Sent {fmtDateTime(c.createdAt)}</p>
                  <div className="mt-4 flex flex-wrap items-start gap-3">
                    <form action={approveAd}><input type="hidden" name="id" value={c.id} /><button className={btn}>Approve</button></form>
                    <form action={rejectAd} className="flex flex-wrap gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      <input name="reason" placeholder="Reason (sent to artist)" className={`${input} w-64`} required minLength={3} maxLength={300} />
                      <button className={btnDanger}>Reject</button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mb-3 mt-10 font-serif text-xl">Approved, waiting for payment ({waiting.length})</h2>
      {waiting.length === 0 ? <Empty title="None" /> : (
        <div className="space-y-2">{waiting.map((c) => <div key={c.id} className={`${card} px-5 py-3 text-sm`}><span className="font-medium">{c.artistName}</span> <span className="text-[#9A9585]">· {c.packageName} · {formatNaira(c.priceKobo)} · {c.phone}</span></div>)}</div>
      )}

      <h2 className="mb-3 mt-10 font-serif text-xl">Booked and running ({running.length})</h2>
      {running.length === 0 ? <Empty title="Nothing booked" hint="Paid ads show here with real numbers." /> : (
        <div className="space-y-2">
          {running.map((c) => (
            <div key={c.id} className={`${card} px-5 py-3 text-sm`}>
              <p><span className="font-medium">{c.artistName}</span> <span className="text-[#9A9585]">· {c.packageName} · {c.startDate} to {c.endDate} · {c.startDate <= today ? "live" : "starts later"}</span></p>
              {c.placement === "BAG_INSERT"
                ? <p className="text-[#D4AF37]">Physical: put the printed card in each delivery bag on these dates.</p>
                : <p className="text-[#9A9585]">{num(c.id, "IMPRESSION")} people saw it · {num(c.id, "CLICK")} clicked</p>}
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 font-serif text-xl">Past</h2>
          <div className="space-y-2">{past.map((c) => <div key={c.id} className={`${card} px-5 py-3 text-sm text-[#9A9585]`}><span className="text-[#F5F1E6]">{c.artistName}</span> · {c.packageName} · {c.status === "PAID" ? "finished" : c.status.toLowerCase()}{c.rejectReason ? ` · ${c.rejectReason}` : ""}</div>)}</div>
        </>
      )}
    </>
  );
}
