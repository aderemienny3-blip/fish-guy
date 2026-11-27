import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDay } from "@/lib/admin/format";
import { waLink } from "@/lib/admin/whatsapp";
import { formatNaira } from "@/lib/money";
import { Empty, PageHeader, btn, btnGhost, card } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/** A phone-friendly list for riders: only orders that are out for delivery, assigned to them or to nobody yet. */
export default async function RiderPage() {
  const admin = await requireAdmin();
  const mine = admin.role === "RIDER";
  const orders = await db.order.findMany({
    where: { status: "OUT_FOR_DELIVERY", ...(mine ? { OR: [{ riderId: admin.id }, { riderId: null }] } : {}) },
    orderBy: [{ deliveryDate: "asc" }, { slot: { startMinute: "asc" } }],
    include: { zone: true, slot: true, items: { select: { nameSnapshot: true, quantity: true } }, rider: { select: { name: true } } },
    take: 100,
  });
  return (
    <>
      <PageHeader title={mine ? "My deliveries" : "Out for delivery"} subtitle="Call the customer when you arrive. Open the order to mark it delivered with the cold-chain check and a photo." actions={MANAGERS.includes(admin.role) ? <Link href="/admin/orders?status=OUT_FOR_DELIVERY" className={btnGhost}>Orders board</Link> : undefined} />
      {orders.length === 0 ? <Empty title="Nothing to deliver right now" hint="Orders appear here once the packer hands them to a rider." /> : (
        <div className="space-y-4">
          {orders.map((o) => (
            <article key={o.id} className={`${card} space-y-3 p-5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-serif text-xl text-[#D4AF37]">{o.contactName}</p>
                <p className="text-sm text-[#9A9585]">{fmtDay(o.deliveryDate)}, {o.slot.label} · {o.zone.name}</p>
              </div>
              <p className="text-sm">{o.addressLine}{o.landmark ? `, near ${o.landmark}` : ""}</p>
              <p className="text-sm text-[#9A9585]">{o.items.map((i) => `${i.quantity} × ${i.nameSnapshot}`).join(", ")}</p>
              {o.notes && <p className="rounded-md border border-white/10 p-2 text-sm">Note: {o.notes}</p>}
              <p className="text-xs text-[#9A9585]">{o.rider ? `Rider: ${o.rider.name}` : "No rider assigned yet"} · Order total {formatNaira(o.totalKobo)}</p>
              <div className="flex flex-wrap gap-2">
                <a href={`tel:+${o.contactPhone}`} className={btn}>Call</a>
                <a href={waLink(o.contactPhone, `Hello ${o.contactName.trim().split(/\s+/)[0]}, this is Fish Guy. Your order ${o.reference} is at your address. Please come out or call us.`)} target="_blank" rel="noreferrer" className={btnGhost}>WhatsApp</a>
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${o.addressLine}, ${o.zone.name}, Lagos`)}`} target="_blank" rel="noreferrer" className={btnGhost}>Map</a>
                <Link href={`/admin/orders/${o.reference}`} className={btnGhost}>Open and deliver</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
