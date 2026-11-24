"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, nairaToKobo, str } from "@/lib/admin/format";
import { SETTING_ID, recordEarnings } from "@/lib/music/earnings";
import { MIN_PAYOUT_FLOOR_KOBO, percentToBps } from "@/lib/music/split-math";
import { sendEmail } from "@/lib/notify";
import { formatNaira } from "@/lib/money";

const back = "/admin/music/payouts";
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function saveSetting(fd: FormData) {
  await requireAdmin(MANAGERS);
  const artistBps = percentToBps(str(fd, "percent"));
  if (artistBps === null) bail(back, "Enter the artist share as a percentage, like 70.");
  const minPayoutKobo = nairaToKobo(str(fd, "min") || "5000");
  if (minPayoutKobo === null || minPayoutKobo < MIN_PAYOUT_FLOOR_KOBO) bail(back, "The minimum payout must be at least ₦1,000.");
  await db.payoutSetting.upsert({ where: { id: SETTING_ID }, create: { id: SETTING_ID, artistBps, minPayoutKobo }, update: { artistBps, minPayoutKobo } });
  await recordEarnings();
  redirect(`${back}?saved=1`);
}

export async function syncEarnings() {
  await requireAdmin(MANAGERS);
  const n = await recordEarnings();
  redirect(`${back}?synced=${n}`);
}

export async function markPaid(fd: FormData) {
  await requireAdmin(MANAGERS);
  const ref = str(fd, "ref").slice(0, 80);
  if (!ref) bail(back, "Enter the bank transfer reference or a note, so there is a record.");
  const p = await db.payout.findUnique({ where: { id: str(fd, "id") }, include: { artist: { select: { name: true, email: true } } } });
  if (!p || p.status !== "REQUESTED") redirect(back);
  const r = await db.payout.updateMany({ where: { id: p.id, status: "REQUESTED" }, data: { status: "PAID", paidAt: new Date(), transferRef: ref } });
  if (r.count > 0 && p.artist.email) {
    await sendEmail(p.artist.email, `Your Fish Guy payout of ${formatNaira(p.amountKobo)} has been sent`,
      `<div style="font-family:Arial,sans-serif;max-width:480px"><h2>Payout sent</h2><p>Hi ${esc(p.artist.name)}, we paid ${formatNaira(p.amountKobo)} to ${esc(p.bankName)} (${esc(p.accountName)}). Reference: ${esc(ref)}.</p></div>`).catch(() => false);
  }
  redirect(`${back}?saved=1`);
}

/** Puts the money back in the artist's available balance. */
export async function rejectPayout(fd: FormData) {
  await requireAdmin(MANAGERS);
  const note = str(fd, "note").slice(0, 200) || null;
  const id = str(fd, "id");
  await db.$transaction(async (tx) => {
    const r = await tx.payout.updateMany({ where: { id, status: "REQUESTED" }, data: { status: "REJECTED", note } });
    if (r.count > 0) await tx.earning.updateMany({ where: { payoutId: id }, data: { payoutId: null } });
  });
  redirect(`${back}?saved=1`);
}
