import { db } from "@/lib/db";

/** Records who did what in admin. Never throws: a failed log must not block the action. */
export async function audit(admin: { id: string; name: string }, action: string, target: string, detail?: string) {
  try {
    await db.auditLog.create({ data: { adminId: admin.id, adminName: admin.name, action, target, detail: detail ? detail.slice(0, 500) : null } });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
