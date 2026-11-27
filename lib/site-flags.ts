import { cache } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";

export type SiteFlags = { music: boolean; openMinute: number; closeMinute: number };

/** Switches and opening hours that every page needs. Read fresh on each request; falls back to safe defaults if the database is down. */
export const getSiteFlags = cache(async (): Promise<SiteFlags> => {
  await connection();
  try {
    const s = await db.storeSettings.findUnique({ where: { id: 1 }, select: { musicEnabled: true, openMinute: true, closeMinute: true } });
    return { music: s?.musicEnabled ?? true, openMinute: s?.openMinute ?? 510, closeMinute: s?.closeMinute ?? 1260 };
  } catch {
    return { music: true, openMinute: 510, closeMinute: 1260 };
  }
});
