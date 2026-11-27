"use server";

import { redirect } from "next/navigation";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, str } from "@/lib/admin/format";
import { BROADCAST_TEMPLATE, MAX_PER_SEND, broadcastRecipients } from "@/lib/broadcast";
import { sendTemplateMessage, whatsappConfigured } from "@/lib/whatsapp";

const BACK = "/admin/broadcast";

export async function sendBroadcast(fd: FormData) {
  await requireAdmin(MANAGERS);
  const segment = str(fd, "segment") || null;
  const message = str(fd, "message").replace(/\s+/g, " ").trim();
  if (!whatsappConfigured()) bail(BACK, "WhatsApp is not set up yet. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_ID first.");
  if (message.length < 5 || message.length > 300) bail(BACK, "Write a message of 5 to 300 characters.");
  if (fd.get("confirm") !== "yes") bail(BACK, "Tick the box to confirm you want to send.");

  const { recipients } = await broadcastRecipients(segment);
  const batch = recipients.slice(0, MAX_PER_SEND);
  if (batch.length === 0) bail(BACK, "Nobody to send to. Either no one in this group agreed to offers, or they were all messaged in the last 12 hours.");

  let sent = 0, failed = 0;
  for (let i = 0; i < batch.length; i += 5) {
    const results = await Promise.all(batch.slice(i, i + 5).map((c) => sendTemplateMessage(c.phone, BROADCAST_TEMPLATE(), [c.name.split(" ")[0] || "there", message], undefined, "broadcast")));
    for (const r of results) r.ok ? sent++ : failed++;
  }
  redirect(`${BACK}?sent=${sent}&failed=${failed}&left=${Math.max(0, recipients.length - batch.length)}`);
}
