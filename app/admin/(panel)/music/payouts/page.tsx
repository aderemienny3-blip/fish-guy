import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { fmtDateTime } from "@/lib/admin/format";
import { getSetting } from "@/lib/music/earnings";
import { Banner, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { formatNaira } from "@/lib/money";
import { markPaid, rejectPayout, saveSetting, syncEarnings } from "./actions";

export const dynamic = "force-dynamic";

export default async function Payouts({ searchParams }: { searchParams: Promise<{ saved?: string; synced?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const [setting, requests, recent, owing] = await Promise.all([
    getSetting(),
    db.payout.findMany({ where: { status: "REQUESTED" }, orderBy: { requestedAt: "asc" }, include: { artist: { select: { name: true } } } }),
    db.payout.findMany({ where: { status: { not: "REQUESTED" } }, orderBy: { requestedAt: "desc" }, take: 15, include: { artist: { select: { name: true } } } }),
    db.earning.groupBy({ by: ["artistId"], where: { payoutId: null, orderItem: { order: { status: "PAID" } } }, _sum: { amountKobo: true } }),
  ]);
  const names = new Map((await db.artist.findMany({ where: { id: { in: owing.map((o) => o.artistId) } }, select: { id: true, name: true } })).map((a) => [a.id, a.name]));
  const totalOwed = owing.reduce((n, o) => n + (o._sum.amountKobo ?? 0), 0);

  return (
    <>
      <PageHeader title="Payouts and splits" subtitle="Set the artist share, pay payout requests, and keep the books." actions={<Link href="/admin/music" className={btnGhost}>Back to music</Link>} />
      {q.saved && <Banner kind="ok">Saved.</Banner>}
      {q.synced && <Banner kind="ok">{q.synced} new earnings recorded.</Banner>}
      {q.error && <Banner>{q.error}</Banner>}

      <form action={saveSetting} className={`${card} mb-6 max-w-2xl space-y-4 p-6`}>
        <h2 className="text-lg font-medium">Artist share</h2>
        <p className="text-sm text-[#9A9585]">The percentage of each sale price that goes to the artists (the rest is Fish Guy&apos;s). Each paid sale is recorded with the share and split sheet that apply at that moment, so changing this only affects future sales. Saving it for the first time also records every past paid sale.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className={label}>Artists get this % of the sale price</label><input name="percent" defaultValue={setting ? setting.artistBps / 100 : ""} inputMode="decimal" className={input} required /></div>
          <div><label className={label}>Smallest payout (naira)</label><input name="min" defaultValue={setting ? setting.minPayoutKobo / 100 : 5000} inputMode="decimal" className={input} /></div>
        </div>
        <button className={btn}>Save</button>
      </form>

      <div className={`${card} mb-6 flex flex-wrap items-center justify-between gap-3 p-4`}>
        <p className="text-sm">Owed to artists and not yet requested: <b>{formatNaira(totalOwed)}</b>{owing.length > 0 && <span className="text-xs text-[#9A9585]"> · {owing.map((o) => `${names.get(o.artistId) ?? "?"} ${formatNaira(o._sum.amountKobo ?? 0)}`).join(", ")}</span>}</p>
        {setting && <form action={syncEarnings}><button className={btnGhost}>Record any missed sales</button></form>}
      </div>

      <h2 className="mb-3 text-lg font-medium">Payout requests</h2>
      {requests.length === 0 ? <p className="mb-6 text-sm text-[#9A9585]">No requests waiting.</p> : (
        <div className="mb-6 space-y-3">
          {requests.map((p) => (
            <div key={p.id} className={`${card} space-y-3 p-4`}>
              <p className="font-medium">{p.artist.name}: {formatNaira(p.amountKobo)} <span className="text-xs text-[#9A9585]">asked {fmtDateTime(p.requestedAt)}</span></p>
              <p className="text-sm">Pay to <b>{p.accountName}</b> · {p.bankName} · <b>{p.accountNumber}</b></p>
              <div className="flex flex-wrap items-end gap-3">
                <form action={markPaid} className="flex items-end gap-2"><input type="hidden" name="id" value={p.id} /><input name="ref" placeholder="Transfer reference" className={input} required /><button className={btn}>Mark paid</button></form>
                <form action={rejectPayout} className="flex items-end gap-2"><input type="hidden" name="id" value={p.id} /><input name="note" placeholder="Reason (optional)" className={input} /><button className={btnGhost}>Reject</button></form>
              </div>
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-medium">Recent payouts</h2>
          <div className="space-y-2">
            {recent.map((p) => <div key={p.id} className={`${card} p-3 text-sm`}>{p.artist.name} · {formatNaira(p.amountKobo)} · {p.status === "PAID" ? `paid ${p.paidAt ? fmtDateTime(p.paidAt) : ""} · ${p.transferRef ?? ""}` : `rejected ${p.note ?? ""}`}</div>)}
          </div>
        </>
      )}
    </>
  );
}
