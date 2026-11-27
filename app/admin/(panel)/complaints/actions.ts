"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { str } from "@/lib/admin/format";
import { RESOLUTIONS } from "@/lib/complaints";
import { sendEmail } from "@/lib/notify";
import { audit } from "@/lib/audit";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function resolveComplaint(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const resolution = str(fd, "resolution");
  const note = str(fd, "note").slice(0, 500);
  if (!(resolution in RESOLUTIONS)) redirect("/admin/complaints?error=" + encodeURIComponent("Choose how it was resolved."));
  const c = await db.complaint.findUnique({ where: { id }, include: { order: { select: { reference: true, contactName: true, contactEmail: true } } } });
  if (!c || c.status !== "OPEN") redirect("/admin/complaints");

  const r = await db.complaint.updateMany({ where: { id, status: "OPEN" }, data: { status: "RESOLVED", resolution, resolutionNote: note || null, resolvedAt: new Date(), resolvedBy: admin.name } });
  if (r.count > 0) {
    await audit(admin, `Complaint ${resolution.toLowerCase()}`, c.order.reference, note);
    if (c.order.contactEmail) {
      await sendEmail(c.order.contactEmail, `Update on your report for ${c.order.reference}`, `<p>Hello ${esc(c.order.contactName.split(/\s+/)[0])}, about the problem you reported: ${esc(RESOLUTIONS[resolution])}.${note ? ` ${esc(note)}` : ""}</p>`);
    }
  }
  redirect("/admin/complaints?saved=1");
}
