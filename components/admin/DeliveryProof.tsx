"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { btn, btnGhost, label, input } from "./ui";

const MAX_EDGE = 1200;

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((res) => c.toBlob(res, type, q));
  return (await toBlob("image/webp", 0.8)) ?? (await toBlob("image/jpeg", 0.8)) ?? Promise.reject(new Error("no blob"));
}

/** Delivery form for the rider: cold-chain checklist, a photo, and one button that marks the order delivered. */
export default function DeliveryProof({ action, reference }: { action: (fd: FormData) => void | Promise<void>; reference: string }) {
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Choose a photo.");
    setBusy(true);
    try {
      const small = await shrink(file).catch(() => { throw new Error("This photo format can't be read. Use a JPG or PNG."); });
      const ext = small.type === "image/webp" ? "webp" : "jpg";
      const blob = await upload(`delivery/${reference}.${ext}`, small, { access: "private", handleUploadUrl: "/api/admin/delivery-photo", contentType: small.type });
      setPath(blob.pathname);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={action} className="space-y-3 rounded-lg border border-white/10 p-4">
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="photoPath" value={path} />
      <p className="text-sm font-medium">Before you mark this delivered</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="frozen" className="mt-1" /> The food was still frozen hard when I handed it over</label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="packed" className="mt-1" /> It was packed cold (ice or insulated bag) and the customer received it</label>
      <div>
        <span className={label}>Photo of the handover (optional, recommended)</span>
        <label className={`${btnGhost} cursor-pointer ${busy ? "pointer-events-none opacity-50" : ""}`}>
          {busy ? "Uploading…" : path ? "Photo added. Replace" : "Take or choose photo"}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPick} disabled={busy} />
        </label>
        {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
      </div>
      <input name="note" maxLength={300} placeholder="Note (for example: left with security)" className={input} />
      <p className="text-xs text-[#9A9585]">If a box is not ticked, write why in the note. The order is still marked delivered.</p>
      <button type="submit" className={btn} disabled={busy}>Mark delivered</button>
    </form>
  );
}
