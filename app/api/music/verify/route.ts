import { NextResponse } from "next/server";
import { getSessionHash } from "@/lib/music/session";
import { MUSIC_REF, confirmMusicOrderForSession } from "@/lib/music/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const ref = typeof body?.paymentReference === "string" ? body.paymentReference : "";
  const sessionHash = await getSessionHash();
  if (!sessionHash || !MUSIC_REF.test(ref)) {
    return NextResponse.json({ error: "Payment could not be confirmed for this browser session." }, { status: 403 });
  }
  try {
    return NextResponse.json({ paid: await confirmMusicOrderForSession(ref, sessionHash) });
  } catch {
    return NextResponse.json({ error: "Payment status is temporarily unavailable. Try again shortly." }, { status: 503 });
  }
}
