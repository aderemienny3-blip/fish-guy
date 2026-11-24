"use client";

import { useState, useTransition, type FormEvent } from "react";
import { upload } from "@vercel/blob/client";
import { btn, input, label } from "@/components/admin/ui";
import { createTrack } from "@/app/admin/(panel)/music/actions";

/** Reads an audio file's length. Gives up after 8s instead of hanging forever. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    let done = false;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      fn();
    };
    const timer = setTimeout(() => finish(() => reject(new Error("timeout"))), 8000);
    a.preload = "metadata";
    a.onloadedmetadata = () =>
      finish(() => (Number.isFinite(a.duration) && a.duration > 0 ? resolve(Math.round(a.duration)) : reject(new Error("no duration"))));
    a.onerror = () => finish(() => reject(new Error("unreadable")));
    a.src = url;
  });
}

function kbps(file: File, seconds: number) {
  return Math.round((file.size * 8) / seconds / 1000);
}

async function put(folder: string, file: File, onPct: (p: number) => void) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const blob = await upload(`music/${folder}/${safe}`, file, {
    access: "private",
    handleUploadUrl: "/api/music/upload",
    multipart: file.size > 10 * 1024 * 1024,
    onUploadProgress: (e) => onPct(Math.round(e.percentage)),
  });
  return blob.pathname;
}

function mb(n: number) {
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

export default function TrackUploadForm({ artists, genres }: { artists: { id: string; name: string }[]; genres: string[] }) {
  const [msg, setMsg] = useState("");
  const [warn, setWarn] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [manualSeconds, setManualSeconds] = useState(false);
  const [, start] = useTransition();

  async function checkQuality(f: File | undefined, kind: "full" | "preview") {
    if (!f?.size) return setWarn((w) => w.filter((x) => !x.startsWith(kind)));
    const notes: string[] = [];
    try {
      const secs = await readDuration(f);
      if (kind === "full") {
        const rate = kbps(f, secs);
        if (rate < 192) notes.push(`full: this MP3 is only about ${rate} kbps. It will sound thin. Ask the artist for a 320 kbps MP3 or a WAV.`);
      } else if (secs > 35) {
        notes.push(`preview: this clip is ${secs}s long. Cut it to 30 seconds so the full song isn't given away.`);
      }
    } catch {
      /* ignore, the submit step reports unreadable files */
    }
    setWarn((w) => [...w.filter((x) => !x.startsWith(kind)), ...notes]);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const fd = new FormData(e.currentTarget);
    const mp3 = fd.get("mp3") as File;
    const preview = fd.get("preview") as File;
    const wav = fd.get("wav") as File;
    const cover = fd.get("cover") as File;
    if (!mp3?.size) return setMsg("Choose the full MP3 first.");
    if (fd.get("isFreeToStream") !== "on" && fd.get("superfanOnly") !== "on" && !preview?.size) return setMsg("Add a 30-second preview, or tick 'Free to stream'.");

    setBusy(true);
    try {
      if (!manualSeconds) {
        setMsg("Reading track length…");
        try {
          fd.set("durationSeconds", String(await readDuration(mp3)));
        } catch {
          setManualSeconds(true);
          setMsg("Your browser couldn't read the track length. Type it in seconds below (for example 3:25 is 205), then press Save again.");
          setBusy(false);
          return;
        }
      } else if (!(Number(fd.get("durationSeconds")) > 0)) {
        setMsg("Type the track length in seconds.");
        setBusy(false);
        return;
      }

      const step = async (text: string, folder: string, file: File) => {
        setMsg(`${text} 0%`);
        return put(folder, file, (p) => setMsg(`${text} ${p}% (${mb(file.size)})`));
      };
      fd.set("mp3Path", await step("Uploading full MP3…", "full", mp3));
      if (preview?.size) fd.set("previewPath", await step("Uploading preview…", "preview", preview));
      if (wav?.size) fd.set("wavPath", await step("Uploading WAV…", "wav", wav));
      if (cover?.size) fd.set("coverPath", await step("Uploading cover art…", "cover", cover));
      for (const k of ["mp3", "preview", "wav", "cover"]) fd.delete(k);

      setMsg("Saving…");
      start(async () => {
        try {
          await createTrack(fd);
        } catch (err) {
          const digest = (err as { digest?: string })?.digest ?? "";
          if (digest.startsWith("NEXT_REDIRECT")) throw err; // normal success redirect
          setMsg("Saved files, but the track could not be created. Please press Save again.");
          setBusy(false);
        }
      });
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setMsg(
        /not allowed/i.test(m) ? "Your admin session expired. Sign in again, then retry."
        : /content.?type|not allowed/i.test(m) ? "That file type isn't accepted. Use MP3, WAV, JPG, PNG or WebP."
        : /token|access denied/i.test(m) ? "File storage rejected the upload. Check BLOB_READ_WRITE_TOKEN in Vercel."
        : `Upload failed${m ? `: ${m}` : "."} Check your connection and try again.`,
      );
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
        <label className="flex items-start gap-2 pb-2 text-sm md:col-span-2"><input type="checkbox" name="superfanOnly" className="mt-1" /> Superfan exclusive: not for sale. Only fans who bought 3 different tracks by this artist can play it. No price or preview needed.</label>
      </div>
      <div>
        <label className={label}>Full MP3 (required). Best: 320 kbps</label>
        <input name="mp3" type="file" accept="audio/mpeg,.mp3" className={input} required onChange={(e) => checkQuality(e.target.files?.[0], "full")} />
      </div>
      <div>
        <label className={label}>30-second preview MP3 (required unless free to stream)</label>
        <input name="preview" type="file" accept="audio/mpeg,.mp3" className={input} onChange={(e) => checkQuality(e.target.files?.[0], "preview")} />
      </div>
      <div><label className={label}>WAV, studio quality, for buyers (optional)</label><input name="wav" type="file" accept="audio/wav,.wav" className={input} /></div>
      <div><label className={label}>Cover art (optional, JPG/PNG/WebP)</label><input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className={input} /></div>
      {manualSeconds && (
        <div><label className={label}>Track length in seconds</label><input name="durationSeconds" inputMode="numeric" className={input} required /></div>
      )}
      {warn.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 p-3 text-sm text-[#D4AF37]">
          {warn.map((w) => <li key={w}>{w.replace(/^(full|preview): /, "")}</li>)}
        </ul>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className={label}>Copyright owner (blank = the artist)</label><input name="copyrightOwner" className={input} maxLength={120} /></div>
        <div><label className={label}>Copyright year</label><input name="copyrightYear" inputMode="numeric" defaultValue={new Date().getFullYear()} className={input} /></div>
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="rightsConfirmed" required className="mt-1" /> The artist has accepted the Artist terms and confirmed they own, or have licensed, all of this music, including any samples.</label>
      <button type="submit" disabled={busy} className={btn}>{busy ? "Working…" : "Save as draft"}</button>
      {msg && <p className="text-sm text-[#9A9585]" aria-live="polite">{msg}</p>}
    </form>
  );
}
