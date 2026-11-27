"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { audit } from "@/lib/audit";
import { sendTestAlert } from "@/lib/alert";

export async function setMusic(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const on = fd.get("music") === "on";
  await db.storeSettings.upsert({ where: { id: 1 }, update: { musicEnabled: on }, create: { id: 1, musicEnabled: on } });
  await audit(admin, on ? "Turned music on" : "Turned music off", "site");
  redirect("/admin/switches?saved=1");
}

export async function testAlert() {
  await requireAdmin(MANAGERS);
  const ok = await sendTestAlert();
  redirect(ok ? "/admin/switches?alert=sent" : "/admin/switches?alert=failed");
}
