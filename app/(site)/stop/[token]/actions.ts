"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readStopToken } from "@/lib/optout";

export async function stopOffers(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const phone = readStopToken(token);
  if (!phone) redirect("/");
  await db.messagingConsent.upsert({ where: { phone }, update: { marketing: false, optedOutAt: new Date() }, create: { phone, marketing: false, source: "stop-link", optedOutAt: new Date() } });
  redirect(`/stop/${token}?done=1`);
}
