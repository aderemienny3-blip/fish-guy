"use server";

import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, str } from "@/lib/admin/format";
import { getStudentRules } from "@/lib/student";

const BACK = "/admin/students";

// The ID photo is personal data: once a decision is made, delete it and keep only the record.
async function dropId(idPath: string | null) {
  if (!idPath) return;
  try { await del(idPath); } catch (e) { console.error("could not delete student ID", e); }
}

export async function approveStudent(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const v = await db.studentVerification.findUnique({ where: { id } });
  if (!v || v.status !== "PENDING") bail(BACK, "That application was already handled.");
  const { validityDays } = await getStudentRules();
  const now = new Date();
  await db.studentVerification.update({
    where: { id },
    data: { status: "APPROVED", approvedAt: now, reviewedAt: now, expiresAt: new Date(now.getTime() + validityDays * 86400000), idPath: null },
  });
  await dropId(v.idPath);
  redirect(`${BACK}?saved=1`);
}

export async function rejectStudent(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const reason = str(fd, "reason");
  if (reason.length < 3) bail(BACK, "Write a short reason so the student knows what to fix.");
  const v = await db.studentVerification.findUnique({ where: { id } });
  if (!v || v.status !== "PENDING") bail(BACK, "That application was already handled.");
  await db.studentVerification.update({ where: { id }, data: { status: "REJECTED", rejectReason: reason.slice(0, 300), reviewedAt: new Date(), idPath: null } });
  await dropId(v.idPath);
  redirect(`${BACK}?saved=1`);
}

export async function revokeStudent(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  await db.studentVerification.updateMany({ where: { id, status: "APPROVED" }, data: { status: "REVOKED", reviewedAt: new Date() } });
  redirect(`${BACK}?saved=1`);
}

export async function addInstitution(fd: FormData) {
  await requireAdmin(MANAGERS);
  const name = str(fd, "name");
  const type = str(fd, "type");
  if (name.length < 3) bail(`${BACK}/institutions`, "Enter the school's full name.");
  if (!["UNIVERSITY", "POLYTECHNIC", "COLLEGE_OF_EDUCATION", "OTHER"].includes(type)) bail(`${BACK}/institutions`, "Choose a type.");
  const exists = await db.institution.findUnique({ where: { name } });
  if (exists) bail(`${BACK}/institutions`, "That school is already on the list.");
  await db.institution.create({ data: { name, type: type as "UNIVERSITY" | "POLYTECHNIC" | "COLLEGE_OF_EDUCATION" | "OTHER" } });
  redirect(`${BACK}/institutions?saved=1`);
}

export async function toggleInstitution(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const i = await db.institution.findUnique({ where: { id } });
  if (i) await db.institution.update({ where: { id }, data: { active: !i.active } });
  redirect(`${BACK}/institutions?saved=1`);
}
