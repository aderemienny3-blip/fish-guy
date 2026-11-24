"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getArtistAccess } from "@/lib/artist-access";
import { getSetting } from "@/lib/music/earnings";
import { sendEmail } from "@/lib/notify";
import { formatNaira } from "@/lib/money";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// Money actions are for the artist themselves. A label's team can see earnings, but cannot move money.
async function ownArtist(fd: FormData) {
  const access = await getArtistAccess();
  if (!access) redirect("/artist/login");
  const artistId = s(fd, "artistId");
  const back = (q: string) => redirect(`/artist?a=${encodeURIComponent(artistId)}&${q}#earnings`);
  const artist = access.via === "artist" ? access.artists.find((a) => a.id === artistId) : undefined;
  if (!artist) back("eerror=" + encodeURIComponent("Only the artist can change payout details or ask for a payout."));
  return { artistId, back, name: artist!.name };
}

export async function saveBank(fd: FormData) {
  const { artistId, back } = await ownArtist(fd);
  const bankName = s(fd, "bankName"), accountName = s(fd, "accountName"), accountNumber = s(fd, "accountNumber").replace(/\s/g, "");
  if (bankName.length < 2 || bankName.length > 60) back("eerror=" + encodeURIComponent("Enter your bank's name."));
  if (!/^\d{10}$/.test(accountNumber)) back("eerror=" + encodeURIComponent("A Nigerian account number has exactly 10 digits."));
  if (accountName.length < 2 || accountName.length > 80) back("eerror=" + encodeURIComponent("Enter the name on the account."));
  await db.artist.update({ where: { id: artistId }, data: { bankName, accountNumber, accountName } });
  back("esaved=bank");
}

export async function requestPayout(fd: FormData) {
  const { artistId, back, name } = await ownArtist(fd);
  const setting = await getSetting();
  if (!setting) back("eerror=" + encodeURIComponent("Payouts have not been switched on yet."));
  const artist = await db.artist.findUnique({ where: { id: artistId }, select: { bankName: true, accountNumber: true, accountName: true } });
  if (!artist?.bankName || !artist.accountNumber || !artist.accountName) back("eerror=" + encodeURIComponent("Save your bank details first."));

  let amount = 0;
  try {
    amount = await db.$transaction(async (tx) => {
      const open = await tx.earning.findMany({ where: { artistId, payoutId: null, orderItem: { order: { status: "PAID" } } }, select: { id: true, amountKobo: true } });
      const total = open.reduce((n, e) => n + e.amountKobo, 0);
      if (total < setting!.minPayoutKobo) throw new Error(`MIN:${setting!.minPayoutKobo}`);
      const p = await tx.payout.create({ data: { artistId, amountKobo: total, bankName: artist!.bankName!, accountNumber: artist!.accountNumber!, accountName: artist!.accountName! } });
      const r = await tx.earning.updateMany({ where: { id: { in: open.map((e) => e.id) }, payoutId: null }, data: { payoutId: p.id } });
      if (r.count !== open.length) throw new Error("RACE");
      return total;
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    if (m.startsWith("MIN:")) back("eerror=" + encodeURIComponent(`You can ask for a payout once you have at least ${formatNaira(Number(m.slice(4)))} available.`));
    back("eerror=" + encodeURIComponent("Could not create the payout request. Please try again."));
  }

  const to = (process.env.ADMIN_ALERT_EMAIL ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (to.length) await sendEmail(to, `Payout request: ${name} ${formatNaira(amount)}`, `<p>${esc(name)} asked for a payout of ${formatNaira(amount)}.</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/music/payouts">Open payouts in admin</a></p>`).catch(() => false);
  back("esaved=payout");
}
