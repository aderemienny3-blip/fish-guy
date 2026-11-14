import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/otp";

export async function POST(req: Request) {
  const { phone } = await req.json().catch(() => ({}));
  const result = await requestOtp(String(phone ?? ""));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
