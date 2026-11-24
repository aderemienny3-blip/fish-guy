"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, str } from "@/lib/admin/format";

const BACK = "/admin/music/reports";

export async function takeDown(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const r = await db.takedownReport.findUnique({ where: { id } });
  if (!r) bail(BACK, "Report not found.");
  const ops = [db.takedownReport.update({ where: { id }, data: { status: "ACTIONED", adminNote: str(fd, "note").slice(0, 500) || null, handledAt: new Date() } })];
  if (r.trackId) ops.push(db.track.update({ where: { id: r.trackId }, data: { isPublished: false } }) as never);
  await db.$transaction(ops);
  redirect(`${BACK}?saved=1`);
}

export async function dismissReport(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  if (!(await db.takedownReport.findUnique({ where: { id } }))) bail(BACK, "Report not found.");
  await db.takedownReport.update({ where: { id }, data: { status: "DISMISSED", adminNote: str(fd, "note").slice(0, 500) || null, handledAt: new Date() } });
  redirect(`${BACK}?saved=1`);
}
