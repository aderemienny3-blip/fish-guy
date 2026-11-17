import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Product photos live in the private blob store; this is the public way to see them.
// Only files under products/ can be read here. Names carry a random suffix, so they can be cached for good.
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams.get("p") ?? "";
  if (!/^products\/[A-Za-z0-9._-]{1,150}$/.test(p) || p.includes("..")) return new NextResponse(null, { status: 404 });
  try {
    const r = await get(p, { access: "private" });
    if (!r || !r.stream) return new NextResponse(null, { status: 404 });
    return new NextResponse(r.stream, {
      headers: {
        "Content-Type": r.blob.contentType || "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
