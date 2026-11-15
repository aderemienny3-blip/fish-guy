"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/admin/password";
import { COOKIE, SESSION_SECONDS, signSession } from "@/lib/admin/session";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = email ? await db.adminUser.findUnique({ where: { email } }) : null;

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    redirect("/admin/login?error=locked");
  }

  // Always run the hash check so a missing account takes as long as a real one.
  const valid = verifyPassword(password, user?.passwordHash);

  if (!user || !user.active || !valid) {
    if (user) {
      const failed = user.failedLogins + 1;
      await db.adminUser.update({
        where: { id: user.id },
        data:
          failed >= MAX_FAILURES
            ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
            : { failedLogins: failed },
      });
    }
    redirect("/admin/login?error=invalid");
  }

  await db.adminUser.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  (await cookies()).set(COOKIE, signSession(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}
