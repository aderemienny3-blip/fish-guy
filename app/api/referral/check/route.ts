import { NextResponse } from "next/server";
import { findCode, getReferralSettings } from "@/lib/referrals";

export const dynamic = "force-dynamic";

/** Is this code real, and what does it give? Says nothing about who owns it. The final check happens when the order is placed. */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code") ?? "";
  const [settings, found] = await Promise.all([getReferralSettings(), findCode(code)]);
  const headers = { "Cache-Control": "no-store" };
  if (!settings.enabled) return NextResponse.json({ valid: false, reason: "Referral codes are not active right now." }, { headers });
  if (!found) return NextResponse.json({ valid: false, reason: "We could not find that code. Check it and try again." }, { headers });
  return NextResponse.json({ valid: true, code: found.code, discountKobo: settings.discountKobo, minOrderKobo: settings.minOrderKobo }, { headers });
}
