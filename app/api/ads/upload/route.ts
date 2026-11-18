import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { db } from "@/lib/db";

export const runtime = "nodejs";

// Public upload of ad artwork to the PRIVATE blob store. Images only, 4 MB max, only while packages are on sale.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("ads/")) throw new Error("Not allowed");
        if ((await db.adPackage.count({ where: { active: true } })) === 0) throw new Error("Ads are not open yet.");
        return { allowedContentTypes: ["image/webp", "image/jpeg", "image/png"], maximumSizeInBytes: 4 * 1024 * 1024, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}
