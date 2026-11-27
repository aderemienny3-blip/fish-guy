"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { canAdvance } from "@/lib/admin/orders";
import { bail, str } from "@/lib/admin/format";
import { notifyOrderStatus } from "@/lib/notify";
import { audit } from "@/lib/audit";

/** Managers choose which rider takes an order. */
export async function assignRider(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const reference = str(fd, "reference");
  const back = `/admin/orders/${reference}`;
  const riderId = str(fd, "riderId");
  const order = await db.order.findUnique({ where: { reference } });
  if (!order) redirect("/admin/orders");
  let name = "nobody";
  if (riderId) {
    const rider = await db.adminUser.findFirst({ where: { id: riderId, role: "RIDER", active: true } });
    if (!rider) bail(back, "That rider is not available.");
    name = rider.name;
  }
  await db.order.update({ where: { id: order.id }, data: { riderId: riderId || null } });
  await audit(admin, "Assigned rider", reference, name);
  redirect(back);
}

/** The rider hands over the order: checklist, optional photo, and the order becomes DELIVERED. */
export async function confirmDelivery(fd: FormData) {
  const admin = await requireAdmin();
  const reference = str(fd, "reference");
  const back = `/admin/orders/${reference}`;
  const order = await db.order.findUnique({ where: { reference } });
  if (!order) redirect("/admin/orders");
  if (order.status !== "OUT_FOR_DELIVERY" || !canAdvance(admin.role, order.status)) bail(back, "You can't mark this order delivered.");
  // A rider can only close their own deliveries once a rider has been assigned.
  if (admin.role === "RIDER" && order.riderId && order.riderId !== admin.id) bail(back, "This delivery is assigned to another rider.");

  const photo = str(fd, "photoPath");
  const photoPath = /^delivery\/[A-Za-z0-9._-]{1,150}$/.test(photo) && !photo.includes("..") ? photo : null;
  const coldChainOk = fd.get("frozen") === "on" && fd.get("packed") === "on";
  const note = str(fd, "note").slice(0, 300) || null;

  const r = await db.order.updateMany({
    where: { id: order.id, status: "OUT_FOR_DELIVERY" },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
      deliveryPhotoPath: photoPath,
      coldChainOk,
      deliveryNote: note,
      riderId: order.riderId ?? (admin.role === "RIDER" ? admin.id : null),
    },
  });
  if (r.count > 0) {
    await notifyOrderStatus(order, "DELIVERED");
    await audit(admin, "Marked delivered", reference, `${coldChainOk ? "cold chain ok" : "cold chain NOT confirmed"}${photoPath ? ", photo" : ""}${note ? `, ${note}` : ""}`);
  }
  redirect(back);
}
