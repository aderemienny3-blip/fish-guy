"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OWNER_ONLY, requireAdmin } from "@/lib/admin/auth";
import { bail, hhmmToMinutes, nairaToKobo, str } from "@/lib/admin/format";

const BACK = "/admin/settings";

function wholeNumber(fd: FormData, key: string, min: number, name: string): number {
  const n = Number(str(fd, key));
  if (!Number.isInteger(n) || n < min) bail(BACK, `${name} must be a whole number, ${min} or more.`);
  return n;
}

export async function saveSettings(fd: FormData) {
  await requireAdmin(OWNER_ONLY);

  const open = hhmmToMinutes(str(fd, "open"));
  const close = hhmmToMinutes(str(fd, "close"));
  if (open === null || close === null || close <= open) bail(BACK, "Closing time must be after opening time.");

  const spendRaw = str(fd, "minSpend");
  const spend = spendRaw ? nairaToKobo(spendRaw) : 0;
  if (spend === null) bail(BACK, "Minimum spend must be a number in naira (or empty).");

  const atRiskDays = wholeNumber(fd, "atRiskDays", 1, "At-risk days");
  const lostDays = wholeNumber(fd, "lostDays", 1, "Lost days");
  if (lostDays <= atRiskDays) bail(BACK, "Lost days must be more than at-risk days.");

  const studentPercent = Number(str(fd, "studentPercent") || "0");
  if (!Number.isInteger(studentPercent) || studentPercent < 0 || studentPercent > 50) bail(BACK, "Student discount must be a whole number from 0 to 50.");
  const maxRaw = str(fd, "studentMax");
  const studentMax = maxRaw ? nairaToKobo(maxRaw) : null;
  if (maxRaw && studentMax === null) bail(BACK, "Student discount cap must be a number in naira (or empty).");
  const studentDays = Number(str(fd, "studentDays") || "365");
  if (!Number.isInteger(studentDays) || studentDays < 30 || studentDays > 1095) bail(BACK, "Verification length must be between 30 and 1095 days.");

  const data = {
    studentDiscountPercent: studentPercent,
    studentDiscountMaxKobo: studentMax,
    studentValidityDays: studentDays,
    openMinute: open,
    closeMinute: close,
    lowStockThreshold: wholeNumber(fd, "lowStock", 0, "Low-stock level"),
    superBuyerMinOrders: wholeNumber(fd, "superOrders", 1, "Super Buyer orders"),
    superBuyerWindowDays: wholeNumber(fd, "superDays", 1, "Super Buyer window"),
    superBuyerMinSpendKobo: spend,
    loyalMinOrders: wholeNumber(fd, "loyalOrders", 1, "Loyal orders"),
    newCustomerDays: wholeNumber(fd, "newDays", 1, "New customer days"),
    atRiskDays,
    lostDays,
  };

  await db.storeSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  redirect(`${BACK}?saved=1`);
}
