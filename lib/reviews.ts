import { db } from "@/lib/db";

export async function getReviewSummary(productId: string): Promise<{ count: number; avg: number }> {
  try {
    const r = await db.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } });
    return { count: r._count._all, avg: Math.round((r._avg.rating ?? 0) * 10) / 10 };
  } catch {
    return { count: 0, avg: 0 };
  }
}

export async function getProductReviews(productId: string, take = 10) {
  try {
    return await db.review.findMany({ where: { productId, status: "APPROVED" }, orderBy: { createdAt: "desc" }, take, select: { id: true, rating: true, comment: true, displayName: true, createdAt: true } });
  } catch {
    return [];
  }
}
