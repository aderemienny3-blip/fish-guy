"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { normalizeNgPhone } from "@/lib/phone";
import { sendEmail } from "@/lib/notify";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clean = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

/** A restaurant, caterer or event planner asks for a price. Lands in admin as a new request. */
export async function requestBulkQuote(fd: FormData) {
  if (clean(fd, "website", 50)) redirect("/bulk?thanks=1"); // hidden field: only bots fill it
  const fail = (m: string): never => redirect(`/bulk?error=${encodeURIComponent(m)}`);
  const name = clean(fd, "name", 80);
  const phone = normalizeNgPhone(clean(fd, "phone", 20));
  const items = clean(fd, "items", 1000);
  if (name.length < 2) fail("Enter your name.");
  if (!phone) fail("Enter a Nigerian phone number we can reach, for example 0801 234 5678.");
  if (items.length < 8) fail("Tell us what you need and roughly how much.");
  const recent = await db.bulkQuote.count({ where: { phone: phone!, createdAt: { gte: new Date(Date.now() - 86_400_000) } } });
  if (recent >= 3) fail("We already have your requests. We will contact you soon.");

  const business = clean(fd, "business", 80) || null;
  const area = clean(fd, "area", 80) || null;
  const neededBy = clean(fd, "neededBy", 60) || null;
  await db.bulkQuote.create({ data: { name, phone: phone!, business, items, area, neededBy } });

  const admins = (process.env.ADMIN_ALERT_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (admins.length) await sendEmail(admins, `Bulk request from ${name}`, `<p><strong>${esc(name)}</strong>${business ? ` (${esc(business)})` : ""}, ${esc(phone!)}</p><p>${esc(items)}</p><p>${area ? `Area: ${esc(area)}. ` : ""}${neededBy ? `Needed by: ${esc(neededBy)}.` : ""}</p><p>Open Bulk requests in admin to reply.</p>`);
  redirect("/bulk?thanks=1");
}
