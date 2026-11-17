import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STUDENT_REF } from "@/lib/student";

// Tells the checkout page whether a saved student code is currently active.
export async function GET(req: Request) {
  const ref = new URL(req.url).searchParams.get("ref") ?? "";
  if (!STUDENT_REF.test(ref)) return NextResponse.json({ valid: false });
  const v = await db.studentVerification.findUnique({ where: { reference: ref }, select: { status: true, expiresAt: true } });
  const valid = !!v && v.status === "APPROVED" && !!v.expiresAt && v.expiresAt > new Date();
  return NextResponse.json({ valid }, { headers: { "Cache-Control": "no-store" } });
}
