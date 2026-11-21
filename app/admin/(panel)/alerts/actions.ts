"use server";

import { redirect } from "next/navigation";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { alertOwner } from "@/lib/whatsapp";

export async function sendTestAlert() {
  await requireAdmin(MANAGERS);
  const results = await alertOwner("TEST | If you can read this, Fish Guy new-order alerts are working");
  if (results.length === 0) redirect("/admin/alerts?error=" + encodeURIComponent("WhatsApp alerts are not set up yet."));
  const bad = results.find((r) => !r.ok);
  if (bad) redirect("/admin/alerts?error=" + encodeURIComponent(`Could not send to …${bad.to.slice(-4)}: ${(bad.error ?? "failed").slice(0, 300)}`));
  redirect("/admin/alerts?sent=1");
}
