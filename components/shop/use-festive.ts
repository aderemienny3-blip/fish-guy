"use client";

import { useEffect, useState } from "react";
import type { PromoRules } from "@/lib/festive-math";

export type FestiveData = { promo: PromoRules | null; cartonProducts: { id: string; cartonKg: number }[] };

const isPreview = () => typeof window !== "undefined" && window.location.search.includes("festivePreview");

let cache: Promise<FestiveData> | null = null;
let cachedAt = 0;
let cachedPreview = false;

function load(force = false): Promise<FestiveData> {
  const preview = isPreview();
  if (!cache || force || preview !== cachedPreview || Date.now() - cachedAt > 60_000) {
    cachedAt = Date.now();
    cachedPreview = preview;
    cache = fetch(`/api/festive${preview ? "?preview=1" : ""}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { promo: null, cartonProducts: [] }))
      .then((j) => ({ promo: j.promo ?? null, cartonProducts: Array.isArray(j.cartonProducts) ? j.cartonProducts : [] }) as FestiveData)
      .catch(() => ({ promo: null, cartonProducts: [] }) as FestiveData);
  }
  return cache;
}

/** The live festive offer (null when none) plus which products are sold by the carton. Admins can add ?festivePreview=1 to any page to preview a deal that is not live yet. */
export function useFestive(refreshKey?: unknown): FestiveData | null {
  const [data, setData] = useState<FestiveData | null>(null);
  useEffect(() => {
    let alive = true;
    load(refreshKey !== undefined).then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, [refreshKey]);
  return data;
}
