import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/customer";
import { creditBalance, getReferralSettings } from "@/lib/referrals";

export const dynamic = "force-dynamic";

/** What the checkout needs to know about the signed-in customer's credit, and whether referral codes are on. */
export async function GET() {
  const [settings, customer] = await Promise.all([getReferralSettings(), getCustomer()]);
  return NextResponse.json({
    enabled: settings.enabled,
    discountKobo: settings.discountKobo,
    minOrderKobo: settings.minOrderKobo,
    signedIn: !!customer,
    balanceKobo: customer ? Math.max(0, await creditBalance(db, customer.id)) : 0,
  }, { headers: { "Cache-Control": "no-store" } });
}
