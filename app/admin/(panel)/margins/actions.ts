"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { nairaToKobo, str } from "@/lib/admin/format";
import { audit } from "@/lib/audit";

/** Saves the cost of one unit (kg, pack or piece) for a product. Empty clears it. */
export async function saveCost(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const raw = str(fd, "cost");
  const cost = raw === "" ? null : nairaToKobo(raw);
  if (raw !== "" && cost === null) redirect("/admin/margins?error=" + encodeURIComponent("Enter the cost as a number, for example 3200."));
  const p = await db.product.findUnique({ where: { id }, select: { name: true } });
  if (!p) redirect("/admin/margins");
  await db.product.update({ where: { id }, data: { costKobo: cost } });
  await audit(admin, "Changed product cost", p.name, cost === null ? "cleared" : String(cost / 100));
  redirect("/admin/margins?saved=1");
}
