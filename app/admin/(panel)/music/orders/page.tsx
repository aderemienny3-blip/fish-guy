import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { Banner, Empty, PageHeader, btnDanger, btnGhost, card, input } from "@/components/admin/ui";
import { formatNaira } from "@/lib/money";
import { refundMusicOrder } from "./actions";

export const dynamic = "force-dynamic";

export default async function MusicOrders({ searchParams }: { searchParams: Promise<{ q?: string; refunded?: string; locked?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const term = (q.q ?? "").trim();
  const orders = await db.musicOrder.findMany({
    where: {
      status: { in: ["PAID", "REFUNDED"] },
      ...(term ? { OR: [{ reference: { contains: term, mode: "insensitive" } }, { buyerEmail: { contains: term, mode: "insensitive" } }, { buyerName: { contains: term, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { items: { include: { track: { select: { title: true, artist: { select: { name: true } } } }, earnings: { select: { amountKobo: true, payoutId: true } } } } },
  });

  return (
    <>
      <PageHeader title="Music orders and refunds" subtitle="Find a paid music order and refund it. Downloads stop and unpaid artist earnings are removed." actions={<Link href="/admin/music" className={btnGhost}>Back to music</Link>} />
      {q.refunded && <Banner kind="ok">Order {q.refunded} marked refunded. Now send the money back from your Paystack dashboard.{Number(q.locked) > 0 ? ` ${q.locked} artist earning(s) were already in a payout request and were not removed: deduct them from that artist by hand.` : ""}</Banner>}
      {q.error && <Banner>{q.error}</Banner>}
      <form className="mb-5 flex max-w-xl gap-2">
        <input name="q" defaultValue={term} placeholder="Reference, email or buyer name" className={input} />
        <button className={btnGhost}>Search</button>
      </form>
      {orders.length === 0 ? (
        <Empty title="No music orders found" hint={term ? "Try another search." : "Paid music orders appear here."} />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const locked = o.items.flatMap((i) => i.earnings).filter((e) => e.payoutId).length;
            return (
              <div key={o.id} className={`${card} p-4 text-sm`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <strong>{o.reference}</strong>
                  <span className={o.status === "REFUNDED" ? "text-red-300" : "text-[#D4AF37]"}>{o.status === "REFUNDED" ? "Refunded" : "Paid"} · {formatNaira(o.amountKobo)}</span>
                </div>
                <p className="mt-1 text-[#9A9585]">{o.buyerName} · {o.buyerEmail} · {fmtDateTime(o.paidAt ?? o.createdAt)}</p>
                <p className="mt-2">{o.items.map((i) => `${i.track.title} (${i.track.artist.name})`).join(", ")}</p>
                {o.status === "REFUNDED" ? (
                  <p className="mt-2 text-[#9A9585]">Refunded {o.refundedAt ? fmtDateTime(o.refundedAt) : ""}{o.refundNote ? ` · ${o.refundNote}` : ""}</p>
                ) : (
                  <form action={refundMusicOrder} className="mt-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                    <input type="hidden" name="id" value={o.id} />
                    <input name="note" maxLength={300} placeholder="Reason (kept for your records)" className={input} />
                    <button className={btnDanger}>Refund this order</button>
                    <label className="flex items-start gap-2 text-xs text-[#9A9585] md:col-span-2">
                      <input type="checkbox" name="confirm" value="yes" className="mt-0.5" />
                      <span>I will return {formatNaira(o.amountKobo)} to the buyer in Paystack. Downloads and streaming for this order stop now.{locked > 0 ? ` ${locked} earning(s) are already in a payout and stay; deduct by hand.` : ""}</span>
                    </label>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
