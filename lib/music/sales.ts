import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notify";

import { MAX_PAY_KOBO, MIN_PWYW_KOBO, RESERVE_MINUTES, chooseAmount, formatRelease, isReleased, parseLagosLocal, toLagosInput } from "@/lib/music/sale-math";

export { MAX_PAY_KOBO, MIN_PWYW_KOBO, RESERVE_MINUTES, chooseAmount, formatRelease, isReleased, parseLagosLocal, toLagosInput };

export class SaleError extends Error {}

type Tx = Prisma.TransactionClient;

// ---- Limited editions ----

const cutoff = () => new Date(Date.now() - RESERVE_MINUTES * 60_000);

export function editionTaken(client: Tx | typeof db, trackId: string) {
  return client.musicOrderItem.count({
    where: { trackId, order: { OR: [{ status: "PAID" }, { status: "PENDING", createdAt: { gte: cutoff() } }] } },
  });
}

const lockTrack = (tx: Tx, trackId: string) => tx.$queryRaw`SELECT "id" FROM "Track" WHERE "id" = ${trackId} FOR UPDATE`;

/** Call inside the transaction that creates the order. Locks the track so two buyers cannot take the last copy. */
export async function reserveEdition(tx: Tx, track: { id: string; editionLimit: number | null }) {
  if (!track.editionLimit) return;
  await lockTrack(tx, track.id);
  if ((await editionTaken(tx, track.id)) >= track.editionLimit) throw new SaleError("This limited edition is sold out.");
}

async function tellAdmins(subject: string, html: string) {
  const to = (process.env.ADMIN_ALERT_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (to.length) await sendEmail(to, subject, html).catch(() => {});
}

/** After payment: give each limited-edition copy its number (No. 14 of 100). Safe to call again. */
export async function assignEditionNumbers(orderId: string) {
  const items = await db.musicOrderItem.findMany({
    where: { orderId, editionNo: null, track: { editionLimit: { not: null } } },
    select: { id: true, trackId: true, track: { select: { editionLimit: true, title: true } } },
  });
  for (const it of items) {
    const r = await db.$transaction(async (tx) => {
      await lockTrack(tx, it.trackId);
      const cur = await tx.musicOrderItem.findUnique({ where: { id: it.id }, select: { editionNo: true } });
      if (cur?.editionNo) return "done" as const;
      const max = await tx.musicOrderItem.aggregate({ where: { trackId: it.trackId, editionNo: { not: null } }, _max: { editionNo: true } });
      const next = (max._max.editionNo ?? 0) + 1;
      if (next > (it.track.editionLimit ?? 0)) return "over" as const;
      await tx.musicOrderItem.update({ where: { id: it.id }, data: { editionNo: next } });
      return "done" as const;
    });
    if (r === "over") {
      await tellAdmins(
        `Limited edition oversold: ${it.track.title}`,
        `<p>A payment for <b>${it.track.title}</b> arrived after all ${it.track.editionLimit} numbered copies were taken (the buyer's checkout had expired before they paid). Decide whether to honour it or refund it in Paystack.</p>`,
      );
    }
  }
}

export async function getSaleInfo(trackId: string) {
  const t = await db.track.findUnique({
    where: { id: trackId },
    select: { priceKobo: true, payWhatYouWant: true, suggestedKobo: true, releaseAt: true, editionLimit: true },
  });
  if (!t) return null;
  const taken = t.editionLimit ? await editionTaken(db, trackId) : 0;
  return {
    payWhatYouWant: t.payWhatYouWant,
    minKobo: t.priceKobo,
    suggestedKobo: t.suggestedKobo,
    releaseAt: t.releaseAt,
    released: isReleased(t.releaseAt),
    editionLimit: t.editionLimit,
    editionLeft: t.editionLimit ? Math.max(0, t.editionLimit - taken) : null,
  };
}
