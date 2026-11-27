"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { str } from "@/lib/admin/format";
import { audit } from "@/lib/audit";

export async function saveCatalogue(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const description = str(fd, "description").slice(0, 600);
  const sizeGuide = str(fd, "sizeGuide").slice(0, 200);
  const p = await db.product.findUnique({ where: { id }, select: { name: true } });
  if (!p) redirect("/admin/catalogue");
  await db.product.update({ where: { id }, data: { description: description || null, sizeGuide: sizeGuide || null } });
  await audit(admin, "Edited product text", p.name);
  redirect("/admin/catalogue?saved=1");
}
