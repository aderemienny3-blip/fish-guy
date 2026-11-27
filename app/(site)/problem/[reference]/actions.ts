"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { COMPLAINT_KINDS } from "@/lib/complaints";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** A customer reports a problem with a delivered order. It lands in admin as an open complaint. */
export async function reportProblem(fd: FormData) {
  const reference = String(fd.get("reference") ?? "");
  const back = `/problem/${reference}`;
  if (!/^FG-[A-F0-9]{16}$/.test(reference)) redirect("/shop");
  const fail = (m: string): never => redirect(`${back}?error=${encodeURIComponent(m)}`);

  const kind = String(fd.get("kind") ?? "");
  const message = String(fd.get("message") ?? "").trim().slice(0, 1000);
  if (!(kind in COMPLAINT_KINDS)) fail("Choose what went wrong.");
  if (message.length < 5) fail("Tell us a little about the problem.");

  const order = await db.order.findUnique({ where: { reference }, select: { id: true, status: true, contactName: true, contactEmail: true, contactPhone: true, reference: true } });
  if (!order || order.status !== "DELIVERED") redirect(back);
  const open = await db.complaint.count({ where: { orderId: order.id, status: "OPEN" } });
  if (open >= 3) fail("We already have your reports for this order and we are working on them.");

  await db.complaint.create({ data: { orderId: order.id, kind, message } });

  const admins = (process.env.ADMIN_ALERT_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (admins.length) {
    await sendEmail(admins, `Problem reported: ${order.reference}`, `<p><strong>${esc(order.contactName)}</strong> (${esc(order.contactPhone)}) reported: ${esc(COMPLAINT_KINDS[kind])}</p><p>${esc(message)}</p><p>Open the Complaints page in admin to resolve it.</p>`);
  }
  if (order.contactEmail) {
    await sendEmail(order.contactEmail, `We received your report for ${order.reference}`, `<p>Hello ${esc(order.contactName.split(/\s+/)[0])}, we have your report and we will come back to you soon.</p>`);
  }
  redirect(`${back}?thanks=1`);
}
