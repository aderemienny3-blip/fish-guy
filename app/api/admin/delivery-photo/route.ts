import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

// Staff-only upload token for proof-of-delivery photos. Any signed-in staff member (riders included).
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const admin = await getAdmin();
        if (!admin) throw new Error("Not allowed");
        if (!pathname.startsWith("delivery/")) throw new Error("Not allowed");
        return { allowedContentTypes: ["image/webp", "image/jpeg", "image/png"], maximumSizeInBytes: 4 * 1024 * 1024, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
