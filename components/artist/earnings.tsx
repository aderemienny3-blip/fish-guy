import { artistLedger, getSetting } from "@/lib/music/earnings";
import { bpsToPercent } from "@/lib/music/split-math";
import { formatNaira } from "@/lib/money";
import { requestPayout, saveBank } from "@/app/(site)/artist/earnings-actions";

const day = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }).format(d) : "");
const MASK = (n: string) => `••••••${n.slice(-4)}`;

export async function Earnings({ artist, canRequest, saved, error }: {
  artist: { id: string; bankName: string | null; accountNumber: string | null; accountName: string | null };
  canRequest: boolean; saved?: string; error?: string;
}) {
  const [setting, l] = await Promise.all([getSetting(), artistLedger(artist.id)]);
  const hasBank = Boolean(artist.bankName && artist.accountNumber && artist.accountName);

  return (
    <section className="ad-block" id="earnings">
      <h2>Your earnings</h2>
      {saved === "bank" && <p className="form-message" role="status">Bank details saved.</p>}
      {saved === "payout" && <p className="form-message" role="status">Payout requested. Fish Guy will pay it into your account and mark it paid here.</p>}
      {error && <p className="form-message is-error" role="alert">{error}</p>}
      {!setting ? (
        <p className="ad-empty">Earnings start showing once Fish Guy sets your share. Sales made before then are added at that time.</p>
      ) : (
        <>
          <div className="ad-cards">
            <div><span>Earned, all time</span><b>{formatNaira(l.earned)}</b><small>your share of sales</small></div>
            <div><span>Available to withdraw</span><b>{formatNaira(l.available)}</b><small>minimum {formatNaira(setting.minPayoutKobo)}</small></div>
            <div><span>Payout requested</span><b>{formatNaira(l.requested)}</b><small>waiting to be paid</small></div>
            <div><span>Paid to you</span><b>{formatNaira(l.paid)}</b><small>so far</small></div>
          </div>
          <p className="ad-note">Your share is {bpsToPercent(setting.artistBps)} of each sale price, shared with any collaborators on the split sheet. It is worked out when the sale is paid, so later changes do not alter past sales.</p>

          {l.perTrack.length > 0 && (
            <div className="ad-table" role="table" aria-label="Earnings by track">
              <div role="row" className="ad-row ad-hd"><span>Track</span><span>You earned</span></div>
              {l.perTrack.slice(0, 20).map((t) => <div role="row" className="ad-row" key={t.title}><span>{t.title}</span><span>{formatNaira(t.kobo)}</span></div>)}
            </div>
          )}
          {l.splitsIn.length > 0 && (
            <>
              <h3>Tracks you share in</h3>
              <ul className="label-list">{l.splitsIn.map((s, i) => <li key={i}><span>{s.track.title} <small>by {s.track.artist.name} · {s.role}</small></span><b>{bpsToPercent(s.bps)}</b></li>)}</ul>
            </>
          )}

          {canRequest ? (
            <>
              <form action={saveBank} className="account-card">
                <input type="hidden" name="artistId" value={artist.id} />
                <h3>Where we pay you</h3>
                <label>Bank name<input name="bankName" defaultValue={artist.bankName ?? ""} maxLength={60} required /></label>
                <label>Account number (10 digits){hasBank && <small> now: {MASK(artist.accountNumber!)}</small>}<input name="accountNumber" inputMode="numeric" maxLength={10} pattern="\d{10}" required /></label>
                <label>Name on the account<input name="accountName" defaultValue={artist.accountName ?? ""} maxLength={80} required /></label>
                <button className="button button-outline" type="submit">Save bank details</button>
              </form>
              <form action={requestPayout}>
                <input type="hidden" name="artistId" value={artist.id} />
                <button className="button button-gold" type="submit" disabled={!hasBank || l.available < setting.minPayoutKobo}>Request payout of {formatNaira(l.available)}</button>
                {!hasBank && <p className="ad-note">Save your bank details first.</p>}
              </form>
            </>
          ) : <p className="ad-note">Only the artist can save bank details and ask for payouts.</p>}

          {l.payouts.length > 0 && (
            <div className="ad-table" role="table" aria-label="Payouts">
              <div role="row" className="ad-row ad-hd"><span>Requested</span><span>Amount</span><span>Status</span><span>Reference</span></div>
              {l.payouts.map((p) => (
                <div role="row" className="ad-row" key={p.id}>
                  <span>{day(p.requestedAt)}</span><span>{formatNaira(p.amountKobo)}</span>
                  <span>{p.status === "PAID" ? `Paid ${day(p.paidAt)}` : p.status === "REJECTED" ? "Not paid" : "Waiting"}</span>
                  <span>{p.transferRef ?? p.note ?? ""}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
