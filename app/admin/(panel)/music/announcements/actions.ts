"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, str } from "@/lib/admin/format";
import { sendAnnouncement } from "@/lib/announce";

const BACK = "/admin/music/announcements";

export async function approveAnnouncement(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  // Claim it first, so a double click cannot send it twice.
  const claimed = await db.fanAnnouncement.updateMany({ where: { id, status: "PENDING" }, data: { status: "SENDING" } });
  if (claimed.count === 0) bail(BACK, "That announcement was already handled.");
  const r = await sendAnnouncement(id);
  await db.fanAnnouncement.update({
    where: { id },
    data: r.sent > 0
      ? { status: "SENT", recipientCount: r.sent, sentAt: new Date(), reviewedAt: new Date(), reviewNote: r.error ?? null }
      : { status: "PENDING", reviewNote: r.error ?? "Nothing was sent." },
  });
  if (r.sent === 0) bail(BACK, r.error ?? "Nothing was sent.");
  redirect(`${BACK}?saved=1`);
}

export async function rejectAnnouncement(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  await db.fanAnnouncement.updateMany({
    where: { id, status: "PENDING" },
    data: { status: "REJECTED", reviewNote: str(fd, "note").slice(0, 300) || null, reviewedAt: new Date() },
  });
  redirect(`${BACK}?saved=1`);
}
