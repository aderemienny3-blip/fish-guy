"use server";

import { redirect } from "next/navigation";
import type { AdminRole } from "@prisma/client";
import { db } from "@/lib/db";
import { OWNER_ONLY, requireAdmin } from "@/lib/admin/auth";
import { hashPassword } from "@/lib/admin/password";
import { bail, isUniqueError, str } from "@/lib/admin/format";

const BACK = "/admin/team";
const STAFF_ROLES: AdminRole[] = ["MANAGER", "PACKER", "RIDER"];

export async function addStaff(fd: FormData) {
  await requireAdmin(OWNER_ONLY);
  const email = str(fd, "email").toLowerCase();
  const name = str(fd, "name");
  const role = str(fd, "role") as AdminRole;
  const password = String(fd.get("password") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) bail(BACK, "Enter a valid email address.");
  if (name.length < 2) bail(BACK, "Enter the person's name.");
  if (!STAFF_ROLES.includes(role)) bail(BACK, "Choose a role.");
  if (password.length < 10) bail(BACK, "The password must be at least 10 characters.");

  try {
    await db.adminUser.create({ data: { email, name, role, passwordHash: hashPassword(password) } });
  } catch (e) {
    if (isUniqueError(e)) bail(BACK, "There is already an account with that email.");
    throw e;
  }
  redirect(`${BACK}?saved=1`);
}

export async function toggleStaff(fd: FormData) {
  const me = await requireAdmin(OWNER_ONLY);
  const id = str(fd, "id");
  if (id === me.id) bail(BACK, "You can't switch off your own account.");
  const user = await db.adminUser.findUnique({ where: { id } });
  if (user) await db.adminUser.update({ where: { id }, data: { active: !user.active } });
  redirect(`${BACK}?saved=1`);
}

export async function resetStaffPassword(fd: FormData) {
  await requireAdmin(OWNER_ONLY);
  const id = str(fd, "id");
  const password = String(fd.get("password") ?? "");
  if (password.length < 10) bail(BACK, "The new password must be at least 10 characters.");
  await db.adminUser.update({
    where: { id },
    data: { passwordHash: hashPassword(password), failedLogins: 0, lockedUntil: null },
  });
  redirect(`${BACK}?saved=1`);
}
