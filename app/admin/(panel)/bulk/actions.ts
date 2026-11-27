"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { str } from "@/lib/admin/format";
import { audit } from "@/lib/audit";
import { QUOTE_STATUS } from "@/lib/bulk";

export async function updateQuote(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const status = str(fd, "status");
  if (!(QUOTE_STATUS as readonly string[]).includes(status)) redirect("/admin/bulk");
  const note = str(fd, "note").slice(0, 500);
  const q = await db.bulkQuote.findUnique({ where: { id }, select: { name: true } });
  if (!q) redirect("/admin/bulk");
  await db.bulkQuote.update({ where: { id }, data: { status, note: note || null } });
  await audit(admin, `Bulk quote ${status.toLowerCase()}`, q.name);
  redirect("/admin/bulk?saved=1");
}
