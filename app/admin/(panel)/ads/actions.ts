"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, nairaToKobo, str } from "@/lib/admin/format";
import { MAX_PRICE_KOBO, MIN_PRICE_KOBO, PLACEMENTS, type Placement } from "@/lib/ads/labels";
import { mailApproved, mailRejected } from "@/lib/ads/mail";
import { overlapCount } from "@/lib/ads/payments";

const BACK = "/admin/ads";
const PKG_BACK = "/admin/ads/packages";

function readPackage(fd: FormData) {
  const name = str(fd, "name");
  const placement = str(fd, "placement") as Placement;
  const price = nairaToKobo(str(fd, "price"));
  const durationDays = Number(str(fd, "durationDays"));
  const maxRaw = str(fd, "maxConcurrent");
  const maxConcurrent = maxRaw ? Number(maxRaw) : null;
  if (name.length < 3) bail(PKG_BACK, "Give the package a name.");
  if (!PLACEMENTS.includes(placement)) bail(PKG_BACK, "Choose where the ad appears.");
  if (price === null || price < MIN_PRICE_KOBO || price > MAX_PRICE_KOBO) bail(PKG_BACK, "Price must be between ₦5,000 and ₦2,000,000.");
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) bail(PKG_BACK, "Days must be a whole number from 1 to 365.");
  if (maxConcurrent !== null && (!Number.isInteger(maxConcurrent) || maxConcurrent < 1)) bail(PKG_BACK, "Limit must be a whole number, 1 or more (or empty).");
  return { name, placement, priceKobo: price, durationDays, maxConcurrent, description: str(fd, "description") || null };
}

export async function createPackage(fd: FormData) {
  await requireAdmin(MANAGERS);
  await db.adPackage.create({ data: readPackage(fd) });
  redirect(`${PKG_BACK}?saved=1`);
}

export async function updatePackage(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  // Price changes affect new bookings only: existing campaigns keep the price they were booked at.
  await db.adPackage.update({ where: { id }, data: readPackage(fd) });
  redirect(`${PKG_BACK}?saved=1`);
}

export async function togglePackage(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const p = await db.adPackage.findUnique({ where: { id } });
  if (p) await db.adPackage.update({ where: { id }, data: { active: !p.active } });
  redirect(`${PKG_BACK}?saved=1`);
}

export async function approveAd(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const c = await db.adCampaign.findUnique({ where: { id }, include: { package: true } });
  if (!c || c.status !== "SUBMITTED") bail(BACK, "That ad was already handled.");
  if (c.package.maxConcurrent !== null) {
    const n = await overlapCount(c.packageId, c.startDate, c.endDate, ["APPROVED", "PAID"], c.id);
    if (n >= c.package.maxConcurrent) bail(BACK, `${c.package.name} is already full for ${c.startDate} to ${c.endDate}. Reject it and ask the artist to pick other dates.`);
  }
  await db.adCampaign.update({ where: { id }, data: { status: "APPROVED", reviewedAt: new Date() } });
  try { await mailApproved(c); } catch (e) { console.error(e); }
  redirect(`${BACK}?saved=1`);
}

export async function rejectAd(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const reason = str(fd, "reason");
  if (reason.length < 3) bail(BACK, "Write a short reason so the artist knows what to fix.");
  const c = await db.adCampaign.findUnique({ where: { id } });
  if (!c || c.status !== "SUBMITTED") bail(BACK, "That ad was already handled.");
  await db.adCampaign.update({ where: { id }, data: { status: "REJECTED", rejectReason: reason.slice(0, 300), reviewedAt: new Date() } });
  try { await mailRejected(c, reason); } catch (e) { console.error(e); }
  redirect(`${BACK}?saved=1`);
}
