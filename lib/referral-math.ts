/** The least a customer ever pays by card, so a payment is never zero. */
export const MIN_PAY_KOBO = 20_000;

/**
 * Works out the referral discount and the credit used, and the amount to pay.
 * baseKobo is the food total after the other discounts; deliveryKobo is the delivery fee.
 * The referral discount comes off the food only, and the total never falls below the minimum payment.
 */
export function applyReferralAndCredit(i: { baseKobo: number; deliveryKobo: number; referralCfgKobo: number; creditAvailableKobo: number; useCredit: boolean; minPayKobo?: number }) {
  const min = i.minPayKobo ?? MIN_PAY_KOBO;
  const gross = Math.max(0, i.baseKobo) + Math.max(0, i.deliveryKobo);
  const referralKobo = Math.max(0, Math.min(i.referralCfgKobo, Math.max(0, i.baseKobo), gross - min));
  const afterReferral = gross - referralKobo;
  const creditKobo = i.useCredit ? Math.max(0, Math.min(i.creditAvailableKobo, afterReferral - min)) : 0;
  return { referralKobo, creditKobo, totalKobo: afterReferral - creditKobo };
}

export type Eligibility = { ok: true } | { ok: false; reason: string };

/** Can this buyer use this code? First orders only, never your own code, and only when the programme is on. */
export function referralEligibility(i: {
  enabled: boolean;
  ownerId: string; ownerPhone: string | null; ownerEmail: string | null;
  buyerId: string | null; buyerPhone: string; buyerEmail: string;
  priorPaidOrders: number;
  baseKobo: number; minOrderKobo: number;
}): Eligibility {
  if (!i.enabled) return { ok: false, reason: "Referral codes are not active right now. Remove the code to continue." };
  const sameEmail = !!i.ownerEmail && i.ownerEmail.toLowerCase() === i.buyerEmail.toLowerCase();
  if (i.ownerId === i.buyerId || i.ownerPhone === i.buyerPhone || sameEmail) return { ok: false, reason: "You can't use your own referral code. Remove it to continue." };
  if (i.priorPaidOrders > 0) return { ok: false, reason: "Referral codes are for a first order only. Remove the code to continue." };
  if (i.baseKobo < i.minOrderKobo) return { ok: false, reason: `Your food total must be at least ₦${(i.minOrderKobo / 100).toLocaleString("en-NG")} to use a referral code.` };
  return { ok: true };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0, O, 1, I

/** A short, readable code such as FISH-K7M2Q. Pass a random source to test. */
export function makeCode(rand: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  let s = "";
  for (let i = 0; i < 5; i++) s += ALPHABET[rand(ALPHABET.length)];
  return `FISH-${s}`;
}

/** Accepts FISH-K7M2Q in any case, with or without the dash or spaces. Returns null if it can't be a code. */
export function normalizeCode(input: string): string | null {
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = /^FISH([A-Z0-9]{5})$/.exec(s);
  return m ? `FISH-${m[1]}` : null;
}
