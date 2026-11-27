import Link from "next/link";
import type { AdminRole } from "@prisma/client";
import { db } from "@/lib/db";
import { MANAGERS } from "@/lib/admin/auth";
import { canAdvance } from "@/lib/admin/orders";
import { fmtDateTime } from "@/lib/admin/format";
import { COMPLAINT_KINDS, hoursSince } from "@/lib/complaints";
import { assignRider, confirmDelivery } from "@/app/admin/(panel)/orders/delivery-actions";
import DeliveryProof from "./DeliveryProof";
import { btn, card, label } from "./ui";

/** Rider, proof of delivery and complaints for one order, shown on the admin order page. */
export default async function OrderOps({ reference, role, adminId }: { reference: string; role: AdminRole; adminId: string }) {
  const order = await db.order.findUnique({
    where: { reference },
    include: { rider: { select: { id: true, name: true } }, complaints: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) return null;
  const manager = MANAGERS.includes(role);
  const riders = manager ? await db.adminUser.findMany({ where: { role: "RIDER", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }) : [];
  const canClose = order.status === "OUT_FOR_DELIVERY" && canAdvance(role, order.status) && (role !== "RIDER" || !order.riderId || order.riderId === adminId);

  return (
    <section className={`${card} space-y-4 p-5 print:hidden`}>
      <h2 className="font-serif text-xl">Delivery</h2>

      {manager ? (
        <form action={assignRider} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="reference" value={order.reference} />
          <div className="min-w-0 flex-1">
            <span className={label}>Rider</span>
            <select name="riderId" defaultValue={order.riderId ?? ""} className="w-full rounded-md border border-white/15 bg-[#0A0A0A] px-3 py-2 text-sm">
              <option value="">Not assigned</option>
              {riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <button type="submit" className={btn}>Save</button>
          {riders.length === 0 && <p className="w-full text-xs text-[#9A9585]">No riders yet. Add a team member with the Rider role on the Team page.</p>}
        </form>
      ) : (
        <p className="text-sm">Rider: {order.rider?.name ?? "Not assigned"}</p>
      )}

      {canClose && <DeliveryProof action={confirmDelivery} reference={order.reference} />}

      {order.status === "DELIVERED" && (
        <div className="space-y-2 text-sm">
          <p>Delivered {order.deliveredAt ? fmtDateTime(order.deliveredAt) : ""}{order.rider ? ` by ${order.rider.name}` : ""}</p>
          <p className={order.coldChainOk === false ? "text-orange-300" : "text-emerald-300"}>
            {order.coldChainOk === null ? "No cold-chain check recorded" : order.coldChainOk ? "Cold chain confirmed by the rider" : "Cold chain NOT confirmed by the rider"}
          </p>
          {order.deliveryNote && <p className="text-[#9A9585]">Note: {order.deliveryNote}</p>}
          {order.deliveryPhotoPath && (
            <a href={`/api/admin/delivery-photo/view?p=${encodeURIComponent(order.deliveryPhotoPath)}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/admin/delivery-photo/view?p=${encodeURIComponent(order.deliveryPhotoPath)}`} alt="Handover photo" className="h-40 w-auto rounded-lg border border-white/15" />
            </a>
          )}
        </div>
      )}

      {order.complaints.length > 0 && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          <p className="text-sm font-medium">Problems reported</p>
          {order.complaints.map((c) => (
            <Link key={c.id} href="/admin/complaints" className="block rounded-md border border-white/10 p-2 text-sm hover:border-[#D4AF37]">
              <span className={c.status === "OPEN" ? "text-orange-300" : "text-emerald-300"}>{c.status === "OPEN" ? "Open" : "Resolved"}</span>
              {" · "}{COMPLAINT_KINDS[c.kind] ?? c.kind}
              {hoursSince(order.deliveredAt, c.createdAt) !== null && <span className="text-[#9A9585]"> · {hoursSince(order.deliveredAt, c.createdAt)}h after delivery</span>}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
