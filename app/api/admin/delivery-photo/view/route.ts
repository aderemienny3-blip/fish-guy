import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

// Delivery photos show a customer's door and goods, so only signed-in staff can open them.
export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin) return new NextResponse(null, { status: 401 });
  const p = new URL(req.url).searchParams.get("p") ?? "";
  if (!/^delivery\/[A-Za-z0-9._-]{1,150}$/.test(p) || p.includes("..")) return new NextResponse(null, { status: 404 });
  try {
    const r = await get(p, { access: "private" });
    if (!r || !r.stream) return new NextResponse(null, { status: 404 });
    return new NextResponse(r.stream, {
      headers: { "Content-Type": r.blob.contentType || "image/webp", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
