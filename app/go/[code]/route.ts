import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SRC_COOKIE, encodeAttribution } from "@/lib/attribution";

// Short tracked link, for example fishguy.ng/go/a-burnaboy. Counts the click, remembers the code for 30 days, then sends the visitor on.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.toLowerCase();
  const link = /^[a-z0-9][a-z0-9-]{1,40}$/.test(clean) ? await db.trackedLink.findFirst({ where: { code: clean, active: true } }).catch(() => null) : null;
  const dest = link && link.destination.startsWith("/") && !link.destination.startsWith("//") ? link.destination : "/";
  const res = NextResponse.redirect(new URL(dest, req.url), 307);
  if (link) {
    await db.linkClick.create({ data: { code: link.code } }).catch(() => null);
    res.cookies.set(SRC_COOKIE, encodeAttribution({ source: "link", medium: link.kind.toLowerCase(), campaign: link.label.slice(0, 60), content: "", ref: link.code }), { maxAge: 30 * 86400, path: "/", sameSite: "lax", secure: new URL(req.url).protocol === "https:" });
  }
  return res;
}
