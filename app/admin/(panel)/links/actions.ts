"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, str } from "@/lib/admin/format";

const BACK = "/admin/links";
const KINDS = ["ARTIST", "REFERRAL", "CAMPUS", "AD", "OTHER"];

export async function createLink(fd: FormData) {
  await requireAdmin(MANAGERS);
  const code = str(fd, "code").toLowerCase();
  const label = str(fd, "label").slice(0, 60);
  const kind = str(fd, "kind");
  const destination = str(fd, "destination") || "/";
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(code)) bail(BACK, "The code must be 2 to 41 letters, numbers or dashes, like unilag-rep.");
  if (label.length < 2) bail(BACK, "Give the link a label so you remember what it is for.");
  if (!KINDS.includes(kind)) bail(BACK, "Choose what the link is for.");
  if (!/^\/[A-Za-z0-9/_\-.?=&%#]*$/.test(destination) || destination.startsWith("//")) bail(BACK, "The destination must be a page on this site, starting with /, like /shop.");
  if (await db.trackedLink.findUnique({ where: { code } })) bail(BACK, "That code is already used.");
  await db.trackedLink.create({ data: { code, label, kind, destination } });
  redirect(`${BACK}?saved=1`);
}

export async function toggleLink(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const l = await db.trackedLink.findUnique({ where: { id } });
  if (l) await db.trackedLink.update({ where: { id }, data: { active: !l.active } });
  redirect(BACK);
}
