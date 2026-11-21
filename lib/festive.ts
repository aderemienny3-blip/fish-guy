import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { lagosNow } from "@/lib/delivery";
import type { PromoRules, RewardType } from "@/lib/festive-math";

type Client = Pick<Prisma.TransactionClient, "order" | "festivePromo">;

const COUNTED = ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

/** Gifts already promised: paid orders plus unpaid orders that are still holding their place. */
export async function giftsClaimed(client: Client = db) {
  return client.order.count({
    where: { giftName: { not: null }, OR: [{ status: { in: [...COUNTED] } }, { status: "PENDING_PAYMENT", expiresAt: { gt: new Date() } }] },
  });
}

type Row = NonNullable<Awaited<ReturnType<typeof db.festivePromo.findUnique>>>;

export const isLive = (row: Pick<Row, "active" | "startDate" | "endDate">, today = lagosNow().date) =>
  row.active && today >= row.startDate && today <= row.endDate;

export function toRules(row: Row, claimed: number): PromoRules {
  return {
    title: row.title,
    startDate: row.startDate,
    endDate: row.endDate,
    giftMinCartons: row.giftMinCartons,
    giftName: row.giftName,
    giftAvailable: !!row.giftName && row.giftQty - claimed > 0,
    bigMinCartons: row.bigMinCartons,
    rewardType: (["PERCENT", "PER_CARTON", "FREE_DELIVERY"].includes(row.rewardType) ? row.rewardType : "NONE") as RewardType,
    rewardValue: row.rewardValue,
    stackWithStudent: row.stackWithStudent,
    popupEnabled: row.popupEnabled,
    ribbonEnabled: row.ribbonEnabled,
    ribbonText: row.ribbonText,
    popupImage: row.popupImage,
    popupHeadline: row.popupHeadline,
    popupMessage: row.popupMessage,
    popupButton: row.popupButton,
    popupLink: row.popupLink,
    popupDelay: row.popupDelay,
    popupFrequency: row.popupFrequency === "DAY" ? "DAY" : "VISIT",
    popupShowOffers: row.popupShowOffers,
  };
}

/** For use inside a checkout transaction (errors are not swallowed). */
export async function loadLivePromo(client: Client): Promise<PromoRules | null> {
  const row = await client.festivePromo.findUnique({ where: { id: 1 } });
  if (!row || !isLive(row)) return null;
  return toRules(row, await giftsClaimed(client));
}

/** For the admin preview: the saved offer even when it is off or not started. Never throws. */
export async function getPreviewPromo(): Promise<PromoRules | null> {
  try {
    const row = await db.festivePromo.findUnique({ where: { id: 1 } });
    return row ? toRules(row, await giftsClaimed(db)) : null;
  } catch {
    return null;
  }
}

/** For pages: the offer that is live right now, or null. Never throws. */
export async function getActivePromo(): Promise<PromoRules | null> {
  try {
    return await loadLivePromo(db);
  } catch {
    return null;
  }
}
