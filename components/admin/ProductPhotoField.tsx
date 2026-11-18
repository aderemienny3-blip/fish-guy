"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { btnGhost, label } from "./ui";

const MAX_EDGE = 1200;

// Shrinks the photo in the browser first, so a 6 MB phone picture becomes ~150 KB.
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => c.toBlob(res, type, q));
  return (await toBlob("image/webp", 0.85)) ?? (await toBlob("image/jpeg", 0.85)) ?? Promise.reject(new Error("no blob"));
}

export default function ProductPhotoField({ initial, title = "Product photo" }: { initial: string; title?: string }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Choose a photo (JPG, PNG or WebP).");
    setBusy(true);
    try {
      const small = await shrink(file).catch(() => { throw new Error("This photo format can't be read. Use a JPG or PNG."); });
      const ext = small.type === "image/webp" ? "webp" : "jpg";
      const blob = await upload(`products/photo.${ext}`, small, { access: "private", handleUploadUrl: "/api/admin/product-photo", contentType: small.type });
      setUrl(`/api/shop/photo?p=${encodeURIComponent(blob.pathname)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className={label}>{title}</span>
      <input type="hidden" name="imageUrl" value={url} />
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border border-white/15 bg-[#0A0A0A] text-xs text-[#9A9585]">
          {url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt="Product" className="h-full w-full object-cover" /> : "No photo"}
        </div>
        <div className="flex flex-col gap-2">
          <label className={`${btnGhost} cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
            {busy ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPick} disabled={busy} />
          </label>
          {url && !busy && <button type="button" className="text-left text-xs text-[#9A9585] underline" onClick={() => setUrl("")}>Remove photo</button>}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
      <p className="mt-2 text-xs text-[#9A9585]">Square or landscape photos on a plain background look best. Remember to press Save after uploading.</p>
    </div>
  );
}
