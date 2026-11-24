"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, str } from "@/lib/admin/format";
import { normalizeIsrc } from "@/lib/music/isrc";

export async function saveMetadata(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const back = `/admin/music/tracks/${id}/sale`;
  if (!(await db.track.findUnique({ where: { id }, select: { id: true } }))) bail("/admin/music", "Track not found.");

  const isrc = normalizeIsrc(str(fd, "isrc"));
  if (isrc === null) bail(back, "That is not a valid ISRC. It has 12 characters, like NGABC2400001.");
  if (isrc) {
    const taken = await db.track.findFirst({ where: { isrc, NOT: { id } }, select: { title: true } });
    if (taken) bail(back, `That ISRC is already used by "${taken.title}". Each recording has its own code.`);
  }
  const yearRaw = Math.round(Number(str(fd, "copyrightYear")));
  const copyrightYear = yearRaw >= 1900 && yearRaw <= new Date().getFullYear() + 1 ? yearRaw : new Date().getFullYear();
  await db.track.update({
    where: { id },
    data: { isrc: isrc || null, copyrightOwner: str(fd, "copyrightOwner").slice(0, 120) || null, copyrightYear },
  });
  redirect(`${back}?saved=1`);
}
