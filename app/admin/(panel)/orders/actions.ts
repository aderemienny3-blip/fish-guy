"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { CANCELLABLE, NEXT_STATUS, canAdvance } from "@/lib/admin/orders";
import { bail, str } from "@/lib/admin/format";

export async function advanceOrder(fd: FormData) {
  const admin = await requireAdmin();
  const reference = str(fd, "reference");
  const back = `/admin/orders/${reference}`;

  const order = await db.order.findUnique({ where: { reference } });
  if (!order) redirect("/admin/orders");

  const to = NEXT_STATUS[order.status];
  if (!to || !canAdvance(admin.role, order.status)) bail(back, "You can't move this order forward.");

  // Guarded update: does nothing if someone else already moved it.
  await db.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: to } });
  redirect(back);
}

export async function cancelOrder(fd: FormData) {
  await requireAdmin(MANAGERS);
  const reference = str(fd, "reference");
  const back = `/admin/orders/${reference}`;

  const order = await db.order.findUnique({ where: { reference } });
  if (!order) redirect("/admin/orders");
  if (!CANCELLABLE.includes(order.status)) bail(back, "This order can't be cancelled any more.");

  await db.$transaction(async (tx) => {
    const r = await tx.order.updateMany({
      where: { id: order.id, status: { in: CANCELLABLE } },
      data: { status: "CANCELLED" },
    });
    if (r.count === 0) return;
    // Put the held stock back on the shelf.
    const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const it of items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { stockQty: { increment: it.quantity } },
      });
    }
  });
  redirect(back);
}
