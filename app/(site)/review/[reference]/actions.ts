"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MAX_COMMENT, clampRating, reviewerName } from "@/lib/reviews-math";

/** Saves reviews for items of a delivered order. They wait for approval in admin before showing. */
export async function submitReviews(fd: FormData) {
  const reference = String(fd.get("reference") ?? "");
  const back = `/review/${reference}`;
  if (!/^FG-[A-F0-9]{16}$/.test(reference)) redirect("/shop");
  const order = await db.order.findUnique({ where: { reference }, include: { items: true } });
  if (!order || order.status !== "DELIVERED") redirect(back);

  const name = reviewerName(order.contactName);
  const rows: { orderId: string; productId: string; rating: number; comment: string | null; displayName: string }[] = [];
  for (const productId of new Set(order.items.map((i) => i.productId))) {
    const rating = clampRating(fd.get(`rating-${productId}`));
    if (rating === null) continue;
    const comment = String(fd.get(`comment-${productId}`) ?? "").trim().slice(0, MAX_COMMENT);
    rows.push({ orderId: order.id, productId, rating, comment: comment || null, displayName: name });
  }
  if (rows.length === 0) redirect(`${back}?error=${encodeURIComponent("Choose a star rating for at least one item.")}`);
  await db.review.createMany({ data: rows, skipDuplicates: true });
  redirect(`${back}?thanks=1`);
}
