"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { str } from "@/lib/admin/format";

export async function setReviewStatus(fd: FormData) {
  await requireAdmin(MANAGERS);
  const status = str(fd, "status");
  if (status !== "APPROVED" && status !== "REJECTED") redirect("/admin/reviews");
  await db.review.updateMany({ where: { id: str(fd, "id") }, data: { status, moderatedAt: new Date() } });
  redirect("/admin/reviews");
}
