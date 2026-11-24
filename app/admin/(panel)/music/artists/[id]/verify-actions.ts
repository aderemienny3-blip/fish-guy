"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { str } from "@/lib/admin/format";

export async function toggleVerified(fd: FormData) {
  await requireAdmin(MANAGERS);
  const a = await db.artist.findUnique({ where: { id: str(fd, "id") }, select: { id: true, verifiedAt: true } });
  if (!a) redirect("/admin/music");
  await db.artist.update({ where: { id: a.id }, data: { verifiedAt: a.verifiedAt ? null : new Date() } });
  redirect(`/admin/music/artists/${a.id}`);
}
