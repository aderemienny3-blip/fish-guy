"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { bail, fmt12, hhmmToMinutes, isUniqueError, nairaToKobo, str } from "@/lib/admin/format";

const BACK = "/admin/delivery";

export async function saveZone(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const name = str(fd, "name");
  const feeKobo = nairaToKobo(str(fd, "fee"));
  const freeRaw = str(fd, "freeOver");
  const freeOverKobo = freeRaw ? nairaToKobo(freeRaw) : null;
  const minRaw = str(fd, "minOrder");
  const minOrderKobo = minRaw ? nairaToKobo(minRaw) : null;
  const days = fd.getAll("days").map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const deliveryDays = days.length > 0 && days.length < 7 ? [...new Set(days)].sort().join(",") : null;
  const note = str(fd, "note").slice(0, 160) || null;
  const active = fd.get("active") === "on";

  if (name.length < 2) bail(BACK, "Enter the area name.");
  if (feeKobo === null) bail(BACK, `Enter a delivery fee in naira for ${name}.`);
  if (freeRaw && freeOverKobo === null) bail(BACK, "Free-delivery amount must be a number in naira.");
  if (minRaw && minOrderKobo === null) bail(BACK, "Minimum order must be a number in naira.");
  // Guard against switching an area on with a free fee by accident. Free delivery must be deliberate (Free over = 0).
  const existing = id ? await db.deliveryZone.findUnique({ where: { id }, select: { isPickup: true } }) : null;
  if (active && !existing?.isPickup && feeKobo === 0 && freeOverKobo !== 0) {
    bail(BACK, `${name} has a ₦0 fee. Enter the delivery fee, or put 0 in "Free over" if delivery there is meant to be free.`);
  }

  const data = { name, feeKobo, freeOverKobo, minOrderKobo, deliveryDays, note, active };
  try {
    if (id) await db.deliveryZone.update({ where: { id }, data });
    else await db.deliveryZone.create({ data });
  } catch (e) {
    if (isUniqueError(e)) bail(BACK, `An area called "${name}" already exists.`);
    throw e;
  }
  redirect(`${BACK}?saved=1`);
}

export async function saveSlot(fd: FormData) {
  await requireAdmin(MANAGERS);
  const settings = await getSettings();
  const id = str(fd, "id");
  const start = hhmmToMinutes(str(fd, "start"));
  const end = hhmmToMinutes(str(fd, "end"));
  const maxOrders = Number(str(fd, "maxOrders"));

  if (start === null || end === null) bail(BACK, "Enter a start and end time.");
  if (end <= start) bail(BACK, "The end time must be after the start time.");
  if (start < settings.openMinute || end > settings.closeMinute) {
    bail(
      BACK,
      `Slots must fall within opening hours (${fmt12(settings.openMinute)} to ${fmt12(settings.closeMinute)}). Change opening hours in Settings if needed.`
    );
  }
  if (!Number.isInteger(maxOrders) || maxOrders < 1) bail(BACK, "Capacity must be a whole number, at least 1.");

  const data = {
    label: str(fd, "label") || `${fmt12(start)} - ${fmt12(end)}`,
    startMinute: start,
    endMinute: end,
    maxOrders,
    active: fd.get("active") === "on",
  };
  if (id) await db.deliverySlot.update({ where: { id }, data });
  else await db.deliverySlot.create({ data });
  redirect(`${BACK}?saved=1`);
}
