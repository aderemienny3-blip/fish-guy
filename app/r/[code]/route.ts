import { NextResponse } from "next/server";
import { normalizeCode } from "@/lib/referral-math";

/** A friend's share link. Remembers the code for 30 days so checkout can fill it in, then opens the shop. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = normalizeCode(code);
  const res = NextResponse.redirect(new URL("/shop", req.url));
  if (clean) res.cookies.set("fg_ref", clean, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax", secure: true });
  return res;
}
