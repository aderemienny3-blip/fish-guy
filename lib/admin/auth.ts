import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminRole } from "@prisma/client";
import { db } from "@/lib/db";
import { COOKIE, verifySession } from "./session";

export const MANAGERS: AdminRole[] = ["OWNER", "MANAGER"];
export const OWNER_ONLY: AdminRole[] = ["OWNER"];

/** The signed-in staff member, or null. Re-checks the database every request. */
export const getAdmin = cache(async () => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const session = verifySession(token);
  if (!session) return null;
  const user = await db.adminUser.findUnique({ where: { id: session.uid } });
  if (!user || !user.active) return null;
  return user;
});

/** Call at the top of every admin page AND every server action. */
export async function requireAdmin(roles?: AdminRole[]) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (roles && !roles.includes(admin.role)) redirect("/admin/orders");
  return admin;
}
