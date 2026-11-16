"use client";

import { useState, useTransition, type FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import { btn, input, label } from "@/components/admin/ui";
import { createTrack } from "@/app/admin/(panel)/music/actions";

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      Number.isFinite(a.duration) ? resolve(Math.round(a.duration)) : reject(new Error("no duration"));
    };
    a.onerror = () => { URL.revokeObjectURL(url); reject(new Error("unreadable")); };
    a.src = url;
  });
}

async function put(folder: string, file: File) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const blob = await upload(`music/${folder}/${safe}`, file, {
    access: "private",
    handleUploadUrl: "/api/music/upload",
    multipart: file.size > 10 * 1024 * 1024,
  });
  return blob.pathname;
}

export default function TrackUploadForm({ artists, genres }: { artists: { id: string; name: string }[]; genres: string[] }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const mp3 = fd.get("mp3") as File;
    const preview = fd.get("preview") as File;
    const wav = fd.get("wav") as File;
    const cover = fd.get("cover") as File;
    if (!mp3?.size) return setMsg("Choose the full MP3.");
    setBusy(true);
    try {
      setMsg("Reading track length…");
      fd.set("durationSeconds", String(await readDuration(mp3)));
      setMsg("Uploading full MP3…");
      fd.set("mp3Path", await put("full", mp3));
      if (preview?.size) { setMsg("Uploading preview…"); fd.set("previewPath", await put("preview", preview)); }
      if (wav?.size) { setMsg("Uploading WAV…"); fd.set("wavPath", await put("wav", wav)); }
      if (cover?.size) { setMsg("Uploading cover art…"); fd.set("coverPath", await put("cover", cover)); }
      for (const k of ["mp3", "preview", "wav", "cover"]) fd.delete(k);
      setMsg("Saving…");
      start(async () => { await createTrack(fd); });
    } catch (err) {
      setMsg(err instanceof Error ? `Upload failed: ${err.message}` : "Upload failed.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={label}>Artist</label>
        <select name="artistId" className={input} required>
          {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div><label className={label}>Title</label><input name="title" className={input} required /></div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={label}>Genre</label>
          <select name="genre" className={input} required>{genres.map((g) => <option key={g}>{g}</option>)}</select>
        </div>
        <div><label className={label}>Mood (optional)</label><input name="mood" className={input} /></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className={label}>Price (naira)</label><input name="price" inputMode="decimal" defaultValue="0" className={input} /></div>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="isFreeToStream" /> Free to stream (full track plays for everyone)</label>
      </div>
      <div><label className={label}>Full MP3 (required)</label><input name="mp3" type="file" accept="audio/mpeg,.mp3" className={input} required /></div>
      <div><label className={label}>30-second preview MP3 (required unless free to stream)</label><input name="preview" type="file" accept="audio/mpeg,.mp3" className={input} /></div>
      <div><label className={label}>WAV (optional, for buyers)</label><input name="wav" type="file" accept="audio/wav,.wav" className={input} /></div>
      <div><label className={label}>Cover art (optional, JPG/PNG/WebP)</label><input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className={input} /></div>
      <button type="submit" disabled={busy} className={btn}>{busy ? "Working…" : "Save as draft"}</button>
      {msg && <p className="text-sm text-[#9A9585]" aria-live="polite">{msg}</p>}
    </form>
  );
}
