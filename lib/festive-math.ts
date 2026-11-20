// Festive carton deal maths. Pure functions, safe to import in the browser AND on the server,
// so the cart and the server always work out the same answer.
import { naira } from "@/lib/shop/format";

export type RewardType = "NONE" | "PERCENT" | "PER_CARTON" | "FREE_DELIVERY";

export type PromoRules = {
  title: string;
  startDate: string; // YYYY-MM-DD, Lagos
  endDate: string;
  giftMinCartons: number;
  giftName: string | null;
  giftAvailable: boolean; // false once all gifts are claimed
  bigMinCartons: number;
  rewardType: RewardType;
  rewardValue: number; // percent, or kobo off per carton
  stackWithStudent: boolean;
};

export const MAX_QTY = 200;

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const fmtShortDate = (iso: string) =>
  new Intl.DateTimeFormat("en-NG", { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));

/** Whole cartons in a cart. Only products with a carton size (in kg) count. */
export function cartonsOf(lines: { qty: number; cartonKg: number | null }[]) {
  return lines.reduce((n, l) => n + (l.cartonKg && l.cartonKg > 0 ? Math.floor(l.qty / l.cartonKg) : 0), 0);
}

export const hasGift = (r: PromoRules) => !!r.giftName && r.giftAvailable;
export const hasReward = (r: PromoRules) => r.rewardType !== "NONE" && (r.rewardType === "FREE_DELIVERY" || r.rewardValue > 0);

export function rewardText(r: PromoRules): string | null {
  if (!hasReward(r)) return null;
  if (r.rewardType === "PERCENT") return `${r.rewardValue}% off your cartons`;
  if (r.rewardType === "PER_CARTON") return `${naira(r.rewardValue)} off every carton`;
  return "free delivery";
}

export type Outcome = { cartons: number; gift: string | null; discountKobo: number; freeDelivery: boolean; nudge: string | null };

/** cartonValueKobo = value of the cart lines that are sold by the carton. */
export function evaluatePromo(r: PromoRules, cartons: number, cartonValueKobo: number): Outcome {
  const gift = hasGift(r) && cartons >= r.giftMinCartons ? r.giftName : null;
  let discountKobo = 0;
  let freeDelivery = false;
  const bigOn = hasReward(r) && cartons >= r.bigMinCartons;
  if (bigOn) {
    if (r.rewardType === "PERCENT") discountKobo = Math.round((cartonValueKobo * r.rewardValue) / 100);
    else if (r.rewardType === "PER_CARTON") discountKobo = Math.min(cartons * r.rewardValue, cartonValueKobo);
    else freeDelivery = true;
  }
  let nudge: string | null = null;
  if (cartons > 0) {
    if (hasGift(r) && cartons < r.giftMinCartons) nudge = `Add ${plural(r.giftMinCartons - cartons, "more carton")} to get a free ${r.giftName}.`;
    else if (hasReward(r) && cartons < r.bigMinCartons) nudge = `Add ${plural(r.bigMinCartons - cartons, "more carton")} to get ${rewardText(r)}.`;
  }
  return { cartons, gift, discountKobo, freeDelivery, nudge };
}

/** Festive discount and student discount: either stack, or the customer gets the bigger one. Never more than the food total. */
export function resolveDiscounts(a: { subtotalKobo: number; promoKobo: number; studentKobo: number; stack: boolean }) {
  let { promoKobo, studentKobo } = a;
  if (!a.stack && promoKobo > 0 && studentKobo > 0) {
    if (studentKobo > promoKobo) promoKobo = 0;
    else studentKobo = 0;
  }
  if (promoKobo + studentKobo > a.subtotalKobo) studentKobo = Math.max(0, a.subtotalKobo - promoKobo);
  return { promoKobo, studentKobo };
}
