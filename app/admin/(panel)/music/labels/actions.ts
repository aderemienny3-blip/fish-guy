"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { str } from "@/lib/admin/format";
import { sendEmail } from "@/lib/notify";
import { LABEL_FEE_KOBO, renewedUntil } from "@/lib/label-rules";
import { formatNaira } from "@/lib/money";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function approveLabel(fd: FormData) {
  await requireAdmin(MANAGERS);
  const l = await db.label.findUnique({ where: { id: str(fd, "id") } });
  if (!l || l.status !== "PENDING") redirect("/admin/music/labels?saved=1");
  await db.label.update({ where: { id: l.id }, data: { status: "APPROVED", approvedAt: new Date(), rejectNote: null } });
  await sendEmail(l.ownerEmail, "Your Fish Guy label is approved",
    `<div style="font-family:Arial,sans-serif;max-width:480px"><h2>${esc(l.name)} is approved</h2><p>Sign in and pay the yearly fee of ${formatNaira(LABEL_FEE_KOBO)} to open your dashboard and add your artists.</p><p><a href="${site()}/label">Open your label account</a></p></div>`).catch(() => false);
  redirect("/admin/music/labels?saved=1");
}

export async function rejectLabel(fd: FormData) {
  await requireAdmin(MANAGERS);
  const l = await db.label.findUnique({ where: { id: str(fd, "id") } });
  if (!l || l.status !== "PENDING") redirect("/admin/music/labels?saved=1");
  const note = str(fd, "note").slice(0, 300) || null;
  await db.label.update({ where: { id: l.id }, data: { status: "REJECTED", rejectNote: note } });
  await sendEmail(l.ownerEmail, "About your Fish Guy label account",
    `<div style="font-family:Arial,sans-serif;max-width:480px"><p>We could not approve ${esc(l.name)} for a label account.${note ? ` ${esc(note)}` : ""}</p><p>You have not been charged. Contact us if you think this is a mistake.</p></div>`).catch(() => false);
  redirect("/admin/music/labels?saved=1");
}

/** For a bank transfer or a payment made another way: gives the label 12 months and records it. */
export async function addYear(fd: FormData) {
  await requireAdmin(MANAGERS);
  const l = await db.label.findUnique({ where: { id: str(fd, "id") } });
  if (!l || l.status !== "APPROVED") redirect("/admin/music/labels?saved=1");
  await db.$transaction([
    db.label.update({ where: { id: l.id }, data: { paidUntil: renewedUntil(l.paidUntil) } }),
    db.labelPayment.create({ data: { labelId: l.id, reference: "FGL-MANUAL-" + Date.now(), amountKobo: LABEL_FEE_KOBO, status: "PAID", paidAt: new Date() } }),
  ]);
  redirect("/admin/music/labels?saved=1");
}
