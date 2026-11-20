"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, nairaToKobo, str } from "@/lib/admin/format";

const BACK = "/admin/festive";
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function saveFestive(fd: FormData) {
  await requireAdmin(MANAGERS);
  const title = str(fd, "title") || "Festive Carton Deals";
  const startDate = str(fd, "startDate");
  const endDate = str(fd, "endDate");
  const giftName = str(fd, "giftName");
  const giftQty = Math.round(Number(str(fd, "giftQty") || "0"));
  const giftMinCartons = Math.round(Number(str(fd, "giftMinCartons") || "2"));
  const bigMinCartons = Math.round(Number(str(fd, "bigMinCartons") || "5"));
  const rewardType = str(fd, "rewardType");
  const percent = Math.round(Number(str(fd, "percent") || "0"));
  const perCartonKobo = nairaToKobo(str(fd, "perCarton") || "0");
  const active = fd.get("active") === "on";

  if (title.length > 50) bail(BACK, "Keep the title under 50 characters.");
  if (!DATE.test(startDate) || !DATE.test(endDate)) bail(BACK, "Choose a start and end date.");
  if (endDate < startDate) bail(BACK, "The end date must be on or after the start date.");
  if (giftName.length > 60) bail(BACK, "Keep the gift name under 60 characters.");
  if (!Number.isInteger(giftQty) || giftQty < 0 || giftQty > 100000) bail(BACK, "Number of gifts must be a whole number, 0 or more.");
  if (!Number.isInteger(giftMinCartons) || giftMinCartons < 1 || giftMinCartons > 50) bail(BACK, "Gift cartons must be between 1 and 50.");
  if (!Number.isInteger(bigMinCartons) || bigMinCartons < 1 || bigMinCartons > 100) bail(BACK, "Reward cartons must be between 1 and 100.");
  if (!["NONE", "PERCENT", "PER_CARTON", "FREE_DELIVERY"].includes(rewardType)) bail(BACK, "Choose a reward.");

  let rewardValue = 0;
  if (rewardType === "PERCENT") {
    if (!Number.isInteger(percent) || percent < 1 || percent > 30) bail(BACK, "Percent off must be between 1 and 30.");
    rewardValue = percent;
  } else if (rewardType === "PER_CARTON") {
    if (perCartonKobo === null || perCartonKobo < 100) bail(BACK, "Enter the naira off per carton.");
    rewardValue = perCartonKobo;
  }

  const hasGift = !!giftName && giftQty > 0;
  if (active && !hasGift && rewardType === "NONE") bail(BACK, "Set a gift or a reward before switching the deal on.");

  const data = {
    active,
    title,
    startDate,
    endDate,
    giftMinCartons,
    giftName: giftName || null,
    giftQty,
    bigMinCartons,
    rewardType,
    rewardValue,
    stackWithStudent: fd.get("stackWithStudent") === "on",
  };
  await db.festivePromo.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  redirect(`${BACK}?saved=1`);
}
