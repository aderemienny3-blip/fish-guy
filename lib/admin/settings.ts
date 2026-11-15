import { db } from "@/lib/db";

/** The single settings row; created with defaults on first use. */
export function getSettings() {
  return db.storeSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
