"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { nairaToKobo, str } from "@/lib/admin/format";
import { audit } from "@/lib/audit";

export async function addSpend(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const day = str(fd, "day");
  const source = str(fd, "source").toLowerCase().slice(0, 40);
  const amount = nairaToKobo(str(fd, "amount"));
  const fail = (m: string): never => redirect("/admin/scorecard?error=" + encodeURIComponent(m));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) fail("Pick the day the money was spent.");
  if (!source) fail("Enter the source, the same name you use as utm_source (for example facebook).");
  if (amount === null || amount <= 0) fail("Enter the amount spent in naira.");
  await db.adSpend.create({ data: { day, source, amountKobo: amount!, note: str(fd, "note").slice(0, 120) || null } });
  await audit(admin, "Added ad spend", source, `${day} ₦${amount! / 100}`);
  redirect("/admin/scorecard?saved=1");
}

export async function deleteSpend(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const row = await db.adSpend.findUnique({ where: { id } });
  if (row) {
    await db.adSpend.delete({ where: { id } });
    await audit(admin, "Deleted ad spend", row.source, `${row.day} ₦${row.amountKobo / 100}`);
  }
  redirect("/admin/scorecard");
}
