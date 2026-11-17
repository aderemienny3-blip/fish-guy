import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { MANAGERS, getAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

// Staff-only upload token for product photos (browser sends the file straight to Blob).
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const admin = await getAdmin();
        if (!admin || !MANAGERS.includes(admin.role)) throw new Error("Not allowed");
        if (!pathname.startsWith("products/")) throw new Error("Not allowed");
        return { allowedContentTypes: ["image/webp", "image/jpeg", "image/png"], maximumSizeInBytes: 4 * 1024 * 1024, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
