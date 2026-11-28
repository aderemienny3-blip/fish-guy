"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { nairaToKobo, str } from "@/lib/admin/format";
import { normalizeNgPhone } from "@/lib/phone";
import { creditBalance } from "@/lib/referrals";
import { audit } from "@/lib/audit";

const back = (q: string): never => redirect(`/admin/referrals?${q}`);

export async function saveReferralSettings(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const discount = nairaToKobo(str(fd, "discount") || "0");
  const reward = nairaToKobo(str(fd, "reward") || "0");
  const min = nairaToKobo(str(fd, "min") || "0");
  if (discount === null || reward === null || min === null) back("error=" + encodeURIComponent("Enter amounts as numbers in naira."));
  const enabled = fd.get("enabled") === "on";
  if (enabled && (discount! <= 0 || reward! <= 0)) back("error=" + encodeURIComponent("Set both the friend's discount and your reward above zero, or switch referrals off."));
  const data = { referralEnabled: enabled, referralDiscountKobo: discount!, referralRewardKobo: reward!, referralMinOrderKobo: min! };
  await db.storeSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  await audit(admin, enabled ? "Referrals on" : "Referrals off", "settings", `discount ₦${discount! / 100}, reward ₦${reward! / 100}, min ₦${min! / 100}`);
  back("saved=1");
}

/** Adds or removes credit by hand, for example to settle a complaint. A note is required and the change is logged. */
export async function adjustCredit(fd: FormData) {
  const admin = await requireAdmin(MANAGERS);
  const who = str(fd, "who");
  const phone = normalizeNgPhone(who);
  const sign = str(fd, "direction") === "remove" ? -1 : 1;
  const amount = nairaToKobo(str(fd, "amount"));
  const note = str(fd, "note").slice(0, 200);
  if (amount === null || amount <= 0 || amount > 50_000_000) back("error=" + encodeURIComponent("Enter an amount in naira."));
  if (note.length < 3) back("error=" + encodeURIComponent("Write a short reason."));
  const customer = await db.customer.findFirst({ where: phone ? { phone } : { email: who.toLowerCase() } });
  if (!customer) back("error=" + encodeURIComponent("No customer with that phone number or email. They need to have signed in or ordered while signed in once."));
  const delta = sign * amount!;
  if (delta < 0 && (await creditBalance(db, customer!.id)) + delta < 0) back("error=" + encodeURIComponent("That would take their credit below zero."));
  await db.creditEntry.create({ data: { customerId: customer!.id, amountKobo: delta, kind: "MANUAL", note: `${note} (by ${admin.name})` } });
  await audit(admin, delta > 0 ? "Added credit" : "Removed credit", customer!.phone ?? customer!.email ?? customer!.id, `₦${Math.abs(delta) / 100}: ${note}`);
  back("saved=1");
}
