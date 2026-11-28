import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";
import { formatNaira } from "@/lib/money";
import { makeCode, normalizeCode } from "@/lib/referral-math";

type Tx = Prisma.TransactionClient;

export async function getReferralSettings(client: Tx | typeof db = db) {
  const s = await client.storeSettings.findUnique({ where: { id: 1 }, select: { referralEnabled: true, referralDiscountKobo: true, referralRewardKobo: true, referralMinOrderKobo: true } });
  return { enabled: s?.referralEnabled ?? false, discountKobo: s?.referralDiscountKobo ?? 0, rewardKobo: s?.referralRewardKobo ?? 0, minOrderKobo: s?.referralMinOrderKobo ?? 0 };
}

export async function creditBalance(client: Tx | typeof db, customerId: string): Promise<number> {
  const r = await client.creditEntry.aggregate({ where: { customerId }, _sum: { amountKobo: true } });
  return r._sum.amountKobo ?? 0;
}

/** The customer's own code. Made the first time it is needed. */
export async function getOrCreateCode(customerId: string): Promise<string> {
  const existing = await db.referralCode.findUnique({ where: { customerId } });
  if (existing) return existing.code;
  for (let i = 0; i < 8; i++) {
    try {
      return (await db.referralCode.create({ data: { customerId, code: makeCode() } })).code;
    } catch (e) {
      const again = await db.referralCode.findUnique({ where: { customerId } });
      if (again) return again.code; // another request made it first
      if ((e as { code?: string }).code !== "P2002") throw e;
    }
  }
  throw new Error("Could not create a referral code");
}

/** Finds the owner of a code typed by a customer. */
export async function findCode(input: string, client: Tx | typeof db = db) {
  const code = normalizeCode(input);
  if (!code) return null;
  const row = await client.referralCode.findUnique({ where: { code }, include: { customer: { select: { id: true, phone: true, email: true, name: true } } } });
  return row ? { code: row.code, owner: row.customer } : null;
}

/** Gives the credit back when an order that used it is expired or cancelled. Safe to call twice. */
export async function releaseCredit(tx: Tx, orderId: string) {
  const spent = await tx.creditEntry.findUnique({ where: { orderId_kind: { orderId, kind: "SPENT" } } });
  if (!spent) return;
  await tx.creditEntry.createMany({ data: [{ customerId: spent.customerId, amountKobo: -spent.amountKobo, kind: "RELEASED", orderId, note: "Order did not complete" }], skipDuplicates: true });
}

/** An order that expired or was cancelled got its credit back, then was paid after all. The credit counts as used again. Safe to call twice. */
export async function reapplyCredit(tx: Tx, orderId: string) {
  await tx.creditEntry.deleteMany({ where: { orderId, kind: "RELEASED" } });
}

/** Pays the referrer once the referred customer's order has been delivered. Safe to call twice. */
export async function grantReferralReward(orderId: string) {
  try {
    const o = await db.order.findUnique({ where: { id: orderId }, select: { id: true, reference: true, status: true, referrerId: true, referralRewardKobo: true } });
    if (!o || o.status !== "DELIVERED" || !o.referrerId || o.referralRewardKobo <= 0) return;
    const made = await db.creditEntry.createMany({ data: [{ customerId: o.referrerId, amountKobo: o.referralRewardKobo, kind: "REFERRAL_REWARD", orderId: o.id, note: `Referral order ${o.reference}` }], skipDuplicates: true });
    if (made.count === 0) return;
    const c = await db.customer.findUnique({ where: { id: o.referrerId }, select: { email: true, name: true } });
    if (c?.email) await sendEmail(c.email, "You earned Fish Guy credit", `<p>Hello ${(c.name ?? "there").split(" ")[0].replace(/[<>&]/g, "")}, someone you referred has received their first order. We added <strong>${formatNaira(o.referralRewardKobo)}</strong> credit to your account. You can use it at checkout when you are signed in.</p>`);
  } catch (e) {
    console.error("referral reward failed", e);
  }
}
