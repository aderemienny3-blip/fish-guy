"use client";

import { useEffect } from "react";
import Image from "next/image";
import type { AdView } from "@/lib/ads/data";
import { recordAd } from "@/lib/ads/client";

export function SponsoredStrip({ ad }: { ad: AdView }) {
  useEffect(() => { recordAd(ad.id, "IMPRESSION"); }, [ad.id]);
  return (
    <a className="sponsored-strip" href={ad.href} {...(ad.external ? { target: "_blank", rel: "sponsored noopener noreferrer" } : {})} onClick={() => recordAd(ad.id, "CLICK")}>
      {ad.imageSrc && <span className="sponsored-art"><Image src={ad.imageSrc} alt="" fill sizes="96px" unoptimized /></span>}
      <span className="sponsored-copy">
        <small>Sponsored sound · {ad.artistName}</small>
        <strong>{ad.headline}</strong>
        {ad.tagline && <span>{ad.tagline}</span>}
      </span>
      <span className="sponsored-cta">Listen →</span>
    </a>
  );
}
