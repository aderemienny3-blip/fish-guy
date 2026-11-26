"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, str } from "@/lib/admin/format";
import { sendEmail } from "@/lib/notify";
import { formatNaira } from "@/lib/money";

const back = "/admin/music/orders";
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Marks a paid music order refunded: downloads and library access stop, unpaid artist earnings are voided.
 * The money itself is sent back from the Paystack dashboard, the same way as a shop refund.
 */
export async function refundMusicOrder(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const note = str(fd, "note").slice(0, 300);
  if (fd.get("confirm") !== "yes") bail(back, "Tick the box to confirm the refund.");

  const order = await db.musicOrder.findUnique({ where: { id }, include: { items: { include: { earnings: true } } } });
  if (!order) bail(back, "That order was not found.");
  if (order.status !== "PAID") bail(back, "Only paid orders can be refunded.");
  const lockedEarnings = order.items.flatMap((i) => i.earnings).filter((e) => e.payoutId).length;

  const done = await db.$transaction(async (tx) => {
    const r = await tx.musicOrder.updateMany({ where: { id, status: "PAID" }, data: { status: "REFUNDED", refundedAt: new Date(), refundNote: note || null } });
    if (r.count === 0) return false;
    await tx.musicDownloadLink.deleteMany({ where: { orderItem: { orderId: id } } });
    await tx.earning.deleteMany({ where: { payoutId: null, orderItem: { orderId: id } } });
    return true;
  });
  if (!done) bail(back, "This order was already changed. Refresh and check it.");

  await sendEmail(
    order.buyerEmail,
    `Your Fish Guy Sounds order ${order.reference} was refunded`,
    `<div style="font-family:Arial,sans-serif;max-width:520px"><h2>Order refunded</h2><p>Hi ${esc(order.buyerName.split(" ")[0] || "there")}, we have refunded your music order <strong>${esc(order.reference)}</strong> (${formatNaira(order.amountKobo)}).</p><p>The money goes back to the way you paid. How long it takes to show is up to your bank. Downloads and streaming for this order are now switched off.</p></div>`,
  ).catch(() => false);

  redirect(`${back}?refunded=${encodeURIComponent(order.reference)}&locked=${lockedEarnings}`);
}
