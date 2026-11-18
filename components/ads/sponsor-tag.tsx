"use client";

import { useEffect } from "react";
import type { AdView } from "@/lib/ads/data";
import { recordAd } from "@/lib/ads/client";

/** Small "sponsored sound" tag shown on most-ordered product cards. */
export function SponsorTag({ ad }: { ad: AdView }) {
  useEffect(() => { recordAd(ad.id, "IMPRESSION"); }, [ad.id]);
  return (
    <a className="sponsor-tag" href={ad.href} {...(ad.external ? { target: "_blank", rel: "sponsored noopener noreferrer" } : {})} onClick={() => recordAd(ad.id, "CLICK")}>
      <span aria-hidden="true">♪</span> Sponsored sound: {ad.artistName}, {ad.headline}
    </a>
  );
}
