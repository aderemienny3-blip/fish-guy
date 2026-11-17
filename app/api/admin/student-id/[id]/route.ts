import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { MANAGERS, getAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

// Staff-only: shows a student's ID photo while their application is being reviewed.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdmin();
  if (!admin || !MANAGERS.includes(admin.role)) return new NextResponse(null, { status: 401 });
  const { id } = await params;
  const v = await db.studentVerification.findUnique({ where: { id }, select: { idPath: true } });
  if (!v?.idPath) return new NextResponse(null, { status: 404 });
  try {
    const r = await get(v.idPath, { access: "private" });
    if (!r || !r.stream) return new NextResponse(null, { status: 404 });
    return new NextResponse(r.stream, {
      headers: { "Content-Type": r.blob.contentType || "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
