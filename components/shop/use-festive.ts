"use client";

import { useEffect, useState } from "react";
import type { PromoRules } from "@/lib/festive-math";

export type FestiveData = { promo: PromoRules | null; cartonProducts: { id: string; cartonKg: number }[] };

let cache: Promise<FestiveData> | null = null;
let cachedAt = 0;

function load(force = false): Promise<FestiveData> {
  if (!cache || force || Date.now() - cachedAt > 60_000) {
    cachedAt = Date.now();
    cache = fetch("/api/festive", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { promo: null, cartonProducts: [] }))
      .then((j) => ({ promo: j.promo ?? null, cartonProducts: Array.isArray(j.cartonProducts) ? j.cartonProducts : [] }) as FestiveData)
      .catch(() => ({ promo: null, cartonProducts: [] }) as FestiveData);
  }
  return cache;
}

/** The live festive offer (null when none) plus which products are sold by the carton. */
export function useFestive(refreshKey?: unknown): FestiveData | null {
  const [data, setData] = useState<FestiveData | null>(null);
  useEffect(() => {
    let alive = true;
    load(refreshKey !== undefined).then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, [refreshKey]);
  return data;
}
