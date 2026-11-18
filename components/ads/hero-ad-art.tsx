"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { AdView } from "@/lib/ads/data";
import { recordAd } from "@/lib/ads/client";

/** A paid artist takes over the home page picture. Always labelled as sponsored. */
export function HeroAdArt({ ad }: { ad: AdView }) {
  useEffect(() => { recordAd(ad.id, "IMPRESSION"); }, [ad.id]);
  return (
    <a className="hero-ad-link" href={ad.href} {...(ad.external ? { target: "_blank", rel: "sponsored noopener noreferrer" } : {})} onClick={() => recordAd(ad.id, "CLICK")}>
      {ad.imageSrc && <Image src={ad.imageSrc} alt={`${ad.artistName}: ${ad.headline}`} fill priority sizes="(max-width: 680px) 100vw, 54vw" unoptimized />}
      <span className="hero-ad-caption">
        <small>Sponsored · {ad.artistName}</small>
        <strong>{ad.headline}</strong>
        {ad.tagline && <span>{ad.tagline}</span>}
        <em>Listen now →</em>
      </span>
    </a>
  );
}
