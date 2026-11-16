import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

// Browser-to-Blob uploads (audio files are too big to pass through a Vercel function).
// Only signed-in OWNER/MANAGER staff can get an upload token.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const admin = await getAdmin();
        if (!admin || (admin.role !== "OWNER" && admin.role !== "MANAGER")) throw new Error("Not allowed");
        return {
          allowedContentTypes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 200 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
