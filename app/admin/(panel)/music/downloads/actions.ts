"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { str } from "@/lib/admin/format";

export async function resetDownloads(fd: FormData) {
  await requireAdmin(MANAGERS);
  await db.musicOrderItem.update({ where: { id: str(fd, "id") }, data: { downloadsFrom: new Date() } });
  redirect("/admin/music/downloads?saved=1");
}
