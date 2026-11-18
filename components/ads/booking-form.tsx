"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { PLACEMENT_INFO, type Placement } from "@/lib/ads/labels";
import { naira } from "@/lib/shop/format";

type Pkg = { id: string; name: string; placement: Placement; priceKobo: number; durationDays: number; description: string | null };
type Track = { id: string; title: string; artistName: string };

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const toBlob = (t: string, q: number) => new Promise<Blob | null>((r) => c.toBlob(r, t, q));
  return (await toBlob("image/webp", 0.85)) ?? (await toBlob("image/jpeg", 0.85)) ?? Promise.reject(new Error("no blob"));
}

export function BookingForm({ packages, tracks, today, lastDay }: { packages: Pkg[]; tracks: Track[]; today: string; lastDay: string }) {
  const router = useRouter();
  const [pkgId, setPkgId] = useState(packages[0]?.id ?? "");
  const [trackId, setTrackId] = useState("");
  const [image, setImage] = useState<{ path: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pkg = useMemo(() => packages.find((p) => p.id === pkgId), [packages, pkgId]);
  const needsImage = pkg ? PLACEMENT_INFO[pkg.placement].imageRequired : false;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) return setError("Choose an image (JPG, PNG or WebP).");
    setUploading(true);
    try {
      const small = await shrink(file).catch(() => { throw new Error("That image format can't be read. Use a JPG or PNG."); });
      const blob = await upload(`ads/creative.${small.type === "image/webp" ? "webp" : "jpg"}`, small, { access: "private", handleUploadUrl: "/api/ads/upload", contentType: small.type });
      setImage({ path: blob.pathname, preview: URL.createObjectURL(small) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const f = new FormData(e.currentTarget);
    if (needsImage && !image) return setError("This package needs an image. Upload your cover art.");
    setBusy(true);
    try {
      const res = await fetch("/api/ads/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: pkgId,
          startDate: f.get("startDate"),
          artistName: f.get("artistName"),
          contactName: f.get("contactName"),
          phone: f.get("phone"),
          email: f.get("email"),
          trackId: trackId || null,
          linkUrl: trackId ? undefined : f.get("linkUrl") || undefined,
          headline: f.get("headline"),
          tagline: f.get("tagline") || undefined,
          imagePath: image?.path ?? null,
          consent: f.get("consent") === "on",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || typeof json.reference !== "string") throw new Error(json.error ?? "We could not send your ad. Please try again.");
      router.push(`/advertise/${json.reference}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not send your ad. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="checkout-shell" onSubmit={submit}>
      <fieldset>
        <legend>1. Choose a package</legend>
        <div className="ad-packages span-2">
          {packages.map((p) => (
            <label key={p.id} className={`ad-package ${p.id === pkgId ? "is-selected" : ""}`}>
              <input type="radio" name="pkg" checked={p.id === pkgId} onChange={() => setPkgId(p.id)} />
              <strong>{p.name}</strong>
              <span className="ad-package-price">{naira(p.priceKobo)} <small>for {p.durationDays} day{p.durationDays === 1 ? "" : "s"}</small></span>
              <span className="ad-package-kind">{PLACEMENT_INFO[p.placement].label}</span>
              <span className="ad-package-blurb">{p.description || PLACEMENT_INFO[p.placement].blurb}</span>
            </label>
          ))}
        </div>
        <label>First day<input name="startDate" type="date" min={today} max={lastDay} defaultValue={today} required /></label>
      </fieldset>

      <fieldset>
        <legend>2. Your ad</legend>
        <label>Artist or brand name<input name="artistName" required minLength={2} maxLength={80} /></label>
        <label>Headline (shown on the ad)<input name="headline" required minLength={3} maxLength={60} placeholder="e.g. New single out now" /></label>
        <label className="span-2">Short line (optional)<input name="tagline" maxLength={120} /></label>
        <label className="span-2">
          Where should people go?
          <select value={trackId} onChange={(e) => setTrackId(e.target.value)}>
            <option value="">A link I will paste (Audiomack, YouTube, Spotify, Boomplay…)</option>
            {tracks.map((t) => <option key={t.id} value={t.id}>{t.title}, {t.artistName} (on Fish Guy Sounds)</option>)}
          </select>
        </label>
        {!trackId && <label className="span-2">Link<input name="linkUrl" type="url" placeholder="https://" required /></label>}
        <div className="span-2 ad-image">
          <span>Cover art or artwork{needsImage ? "" : " (optional)"}</span>
          <div className="ad-image-row">
            {image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={image.preview} alt="Your artwork" />}
            <label className="button button-outline">
              {uploading ? "Uploading…" : image ? "Replace image" : "Upload image"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} disabled={uploading} hidden />
            </label>
          </div>
          <p className="field-note">Square images work best. No explicit or hateful content, and only music or content you own.</p>
        </div>
      </fieldset>

      <fieldset>
        <legend>3. Contact</legend>
        <label>Your name<input name="contactName" autoComplete="name" required minLength={2} /></label>
        <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="080..." required /></label>
        <label className="span-2">Email (we send updates here)<input name="email" type="email" autoComplete="email" required /></label>
      </fieldset>

      <label className="check-row">
        <input type="checkbox" name="consent" required />
        <span>I own or control this music and artwork, and I agree it can be reviewed and removed if it breaks the rules. I will pay only after approval.</span>
      </label>
      {error && <p className="form-message is-error" role="alert">{error}</p>}
      <button className="button button-gold" type="submit" disabled={busy || uploading || !pkg}>{busy ? "Sending…" : pkg ? `Send for review (${naira(pkg.priceKobo)} after approval)` : "Send for review"}</button>
    </form>
  );
}
