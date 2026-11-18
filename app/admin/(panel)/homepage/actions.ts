"use server";

import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, str } from "@/lib/admin/format";
import { getSettings } from "@/lib/admin/settings";

const BACK = "/admin/homepage";
const PHOTO_URL = /^\/api\/shop\/photo\?p=products%2F[A-Za-z0-9._-]{1,150}$/;
const photoPath = (u: string | null) => (u && PHOTO_URL.test(u) ? decodeURIComponent(u.split("p=")[1]) : null);

export async function saveHero(fd: FormData) {
  await requireAdmin(MANAGERS);
  const imageUrl = str(fd, "imageUrl");
  const caption = str(fd, "caption");
  const alt = str(fd, "alt");
  if (imageUrl && !PHOTO_URL.test(imageUrl)) bail(BACK, "That photo is not valid. Upload it again.");
  if (caption.length > 40) bail(BACK, "Keep the caption under 40 characters.");
  if (alt.length > 120) bail(BACK, "Keep the picture description under 120 characters.");

  const before = await getSettings();
  await db.storeSettings.update({ where: { id: 1 }, data: { heroImageUrl: imageUrl || null, heroCaption: caption || null, heroAlt: alt || null } });
  const old = photoPath(before.heroImageUrl);
  if (old && old !== photoPath(imageUrl)) { try { await del(old); } catch { /* ignore */ } }
  redirect(`${BACK}?saved=1`);
}
