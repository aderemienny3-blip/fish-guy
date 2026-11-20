"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { AdView } from "@/lib/ads/data";
import { recordAd } from "@/lib/ads/client";
import { AdPlay } from "@/components/ads/ad-play";

const SEEN = "fish-guy-ad-popup-v1";

export function AdPopup() {
  const path = usePathname();
  const [ad, setAd] = useState<AdView | null>(null);
  const eligible = path === "/" || path.startsWith("/shop");

  useEffect(() => {
    if (!eligible) return;
    try { if (window.sessionStorage.getItem(SEEN)) return; } catch { /* ignore */ }
    let cancelled = false;
    let timer: number | undefined;
    fetch("/api/ads/active?placement=POPUP", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { ads?: AdView[] }) => {
        const list = j.ads ?? [];
        if (!list.length || cancelled) return;
        const pick = list[Math.floor(Math.random() * list.length)];
        timer = window.setTimeout(() => {
          if (cancelled || document.querySelector(".festive-popup")) return;
          setAd(pick);
          try { window.sessionStorage.setItem(SEEN, "1"); } catch { /* ignore */ }
          recordAd(pick.id, "IMPRESSION");
        }, 4000);
      })
      .catch(() => undefined);
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [eligible]);

  useEffect(() => {
    if (!ad) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAd(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ad]);

  if (!ad || !eligible) return null;
  return (
    <div className="ad-popup-backdrop" onClick={() => setAd(null)}>
      <div className="ad-popup" role="dialog" aria-modal="true" aria-label={`Sponsored: ${ad.headline}`} onClick={(e) => e.stopPropagation()}>
        <button className="ad-popup-close" type="button" onClick={() => setAd(null)} aria-label="Close">✕</button>
        {ad.imageSrc && <div className="ad-popup-art"><Image src={ad.imageSrc} alt="" fill sizes="360px" unoptimized /></div>}
        <p className="ad-label">Sponsored · {ad.artistName}</p>
        <h3>{ad.headline}</h3>
        {ad.tagline && <p className="ad-tagline">{ad.tagline}</p>}
        {ad.trackId && <AdPlay trackId={ad.trackId} adId={ad.id} />}
        <a className={ad.trackId ? "button button-outline" : "button button-gold"} href={ad.href} {...(ad.external ? { target: "_blank", rel: "sponsored noopener noreferrer" } : {})} onClick={() => recordAd(ad.id, "CLICK")}>{ad.trackId ? "Track page" : "Listen now"}</a>
      </div>
    </div>
  );
}
