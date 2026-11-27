import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { Empty, PageHeader, btn, btnDanger, btnGhost, card } from "@/components/admin/ui";
import { setReviewStatus } from "./actions";

export const dynamic = "force-dynamic";
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default async function Reviews() {
  await requireAdmin(MANAGERS);
  const [pending, approved] = await Promise.all([
    db.review.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { product: { select: { name: true } }, order: { select: { reference: true } } } }),
    db.review.findMany({ where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, take: 20, include: { product: { select: { name: true } } } }),
  ]);
  const row = (r: (typeof pending)[number] | (typeof approved)[number], actions: React.ReactNode) => (
    <div key={r.id} className={`${card} p-4 text-sm`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2"><strong>{r.product.name}</strong><span className="text-[#D4AF37]">{stars(r.rating)}</span></div>
      <p className="mt-1 text-[#9A9585]">{r.displayName} · {fmtDateTime(r.createdAt)}{"order" in r ? ` · order ${r.order.reference}` : ""}</p>
      {r.comment && <p className="mt-2">{r.comment}</p>}
      <div className="mt-3 flex gap-2">{actions}</div>
    </div>
  );
  const act = (id: string, status: "APPROVED" | "REJECTED", text: string, cls: string) => (
    <form action={setReviewStatus} key={status}><input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} /><button className={cls}>{text}</button></form>
  );

  return (
    <>
      <PageHeader title="Reviews" subtitle="Customers can only review items from a delivered order. Approve a review before it shows on the product page." actions={<Link href="/admin/orders" className={btnGhost}>Orders</Link>} />
      <h2 className="mb-3 text-lg font-medium">Waiting for you ({pending.length})</h2>
      {pending.length === 0 ? <Empty title="No reviews waiting" hint="New reviews appear here." /> : <div className="mb-8 space-y-3">{pending.map((r) => row(r, <>{act(r.id, "APPROVED", "Approve", btn)}{act(r.id, "REJECTED", "Reject", btnDanger)}</>))}</div>}
      <h2 className="mb-3 mt-8 text-lg font-medium">Showing on the site</h2>
      {approved.length === 0 ? <p className="text-sm text-[#9A9585]">Nothing approved yet.</p> : <div className="space-y-3">{approved.map((r) => row(r, act(r.id, "REJECTED", "Hide", btnDanger)))}</div>}
    </>
  );
}
