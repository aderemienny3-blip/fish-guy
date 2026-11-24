"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, nairaToKobo, str } from "@/lib/admin/format";
import { MIN_PWYW_KOBO, MAX_PAY_KOBO, editionTaken, parseLagosLocal } from "@/lib/music/sales";

export async function saveSale(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const back = `/admin/music/tracks/${id}/sale`;
  const t = await db.track.findUnique({ where: { id }, select: { id: true, isFreeToStream: true } });
  if (!t) bail("/admin/music", "Track not found.");

  const priceKobo = nairaToKobo(str(fd, "price"));
  if (priceKobo === null || priceKobo <= 0) bail(back, "Enter a price above zero.");
  const pwyw = fd.get("payWhatYouWant") === "on";
  if (pwyw && priceKobo < MIN_PWYW_KOBO) bail(back, "For pay what you want, the minimum must be at least ₦100.");
  if (priceKobo > MAX_PAY_KOBO) bail(back, "That price is too high.");

  const sugRaw = str(fd, "suggested");
  let suggestedKobo: number | null = null;
  if (pwyw && sugRaw) {
    suggestedKobo = nairaToKobo(sugRaw);
    if (suggestedKobo === null || suggestedKobo < priceKobo || suggestedKobo > MAX_PAY_KOBO) bail(back, "The suggested amount must be a number at or above the minimum.");
  }

  const relRaw = str(fd, "releaseAt");
  const releaseAt = relRaw ? parseLagosLocal(relRaw) : null;
  if (relRaw && !releaseAt) bail(back, "Enter a valid release date and time.");

  const limRaw = str(fd, "editionLimit");
  let editionLimit: number | null = null;
  if (limRaw) {
    editionLimit = Number(limRaw);
    if (!Number.isInteger(editionLimit) || editionLimit < 1 || editionLimit > 100000) bail(back, "The edition size must be a whole number of 1 or more.");
    const taken = await editionTaken(db, id);
    if (editionLimit < taken) bail(back, `${taken} copies are already sold or being bought, so the edition cannot be smaller than that.`);
  }

  await db.track.update({
    where: { id },
    data: { priceKobo, payWhatYouWant: pwyw, suggestedKobo, releaseAt, editionLimit },
  });
  redirect(`${back}?saved=1`);
}
