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

  if (name.length < 2) bail(BACK, "Enter the area name.");
  if (feeKobo === null) bail(BACK, `Enter a delivery fee in naira for ${name}.`);
  if (freeRaw && freeOverKobo === null) bail(BACK, "Free-delivery amount must be a number in naira.");

  const data = { name, feeKobo, freeOverKobo, active: fd.get("active") === "on" };
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
