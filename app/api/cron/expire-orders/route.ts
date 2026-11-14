import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Call every 5-10 minutes (Vercel Cron or any scheduler) with:
//   Authorization: Bearer $CRON_SECRET
// Releases stock held by orders that were never paid.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stale = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } },
    include: { items: true },
    take: 100,
  });

  let released = 0;
  for (const order of stale) {
    await db.$transaction(async (tx) => {
      // Guarded update so a payment landing at the same moment wins.
      const r = await tx.order.updateMany({
        where: { id: order.id, status: "PENDING_PAYMENT" },
        data: { status: "EXPIRED" },
      });
      if (r.count === 0) return;
      for (const it of order.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { stockQty: { increment: it.quantity } },
        });
      }
      released++;
    });
  }
  return NextResponse.json({ released });
}
