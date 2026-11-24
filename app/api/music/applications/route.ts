import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Please check the application details." }, { status: 400 });
  }
  const artistName = str(body.artistName);
  const contactName = str(body.contactName);
  const email = str(body.email).toLowerCase();
  const links = str(body.links);
  const message = str(body.message);

  if (
    !artistName || artistName.length > 120 ||
    !contactName || contactName.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
    !links || links.length > 1500 || message.length > 1200
  ) {
    return NextResponse.json({ error: "Enter an artist name, contact name, valid email, and music links." }, { status: 400 });
  }
  if (str(body.rights) !== "on") {
    return NextResponse.json({ error: "Please confirm you own this music and agree to the Artist terms." }, { status: 400 });
  }
  await db.artistApplication.create({ data: { artistName, contactName, email, links, message: message || null, rightsAcceptedAt: new Date() } });
  return NextResponse.json({ submitted: true }, { status: 201 });
}
