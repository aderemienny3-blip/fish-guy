import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getArtistEmail } from "@/lib/artist-auth";
import { artistStats } from "@/lib/artist-stats";
import { MAX_PER_WEEK, recipientsFor } from "@/lib/announce";
import { share } from "@/lib/artist-math";
import { formatNaira } from "@/lib/money";
import { RosterOverview } from "@/components/artist/roster-overview";
import { artistLogout } from "./actions";
import { submitAnnouncement } from "./announce-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Artist dashboard | Fish Guy Sounds", robots: { index: false } };

const when = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }).format(d) : "");
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const pctText = (v: number | null) => (v === null ? "Not enough data yet" : `${v}%`);

function Bars({ data, label }: { data: { day: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((n, d) => n + d.value, 0);
  return (
    <div className="ad-bars" role="img" aria-label={`${label}: ${total} in the last ${data.length} days`}>
      {data.map((d) => (
        <span key={d.day} title={`${d.day}: ${d.value}`} style={{ height: `${Math.max(d.value ? 6 : 2, (d.value / max) * 100)}%` }} className={d.value ? "on" : ""} />
      ))}
    </div>
  );
}

function Places({ rows, total, empty }: { rows: { label: string; value: number }[]; total: number; empty: string }) {
  if (rows.length === 0) return <p className="ad-empty">{empty}</p>;
  return (
    <ul className="ad-places">
      {rows.map((r) => (
        <li key={r.label}>
          <span>{r.label}</span>
          <span className="ad-meter"><i style={{ width: `${share(r.value, total)}%` }} /></span>
          <b>{r.value} <small>({share(r.value, total)}%)</small></b>
        </li>
      ))}
    </ul>
  );
}

export default async function ArtistDashboard({ searchParams }: { searchParams: Promise<{ a?: string; announced?: string; error?: string }> }) {
  const email = await getArtistEmail();
  if (!email) redirect("/artist/login");
  const q = await searchParams;
  const artists = await db.artist.findMany({ where: { email }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });

  if (artists.length === 0) {
    return (
      <main className="page-width utility-page">
        <h1>No artist profile found</h1>
        <p className="utility-intro">We could not find an artist linked to {email}. Contact Fish Guy to connect your profile.</p>
        <form action={artistLogout}><button className="button button-outline">Sign out</button></form>
      </main>
    );
  }
  if (artists.length > 1 && (q.a === "all" || !q.a)) {
    return (
      <main className="page-width utility-page artist-dash">
        <p className="eyebrow">ROSTER</p>
        <div className="ad-head">
          <h1>All your artists</h1>
          <form action={artistLogout}><button className="button button-outline" type="submit">Sign out</button></form>
        </div>
        <nav className="ad-switch" aria-label="Your artist profiles">
          <Link href="/artist?a=all" aria-current="page">All artists</Link>
          {artists.map((x) => <Link key={x.id} href={`/artist?a=${x.id}`}>{x.name}</Link>)}
        </nav>
        <RosterOverview artists={artists} />
      </main>
    );
  }
  const artist = artists.find((x) => x.id === q.a) ?? artists[0];
  const [s, announcements, allFans, superfans] = await Promise.all([
    artistStats(artist.id),
    db.fanAnnouncement.findMany({ where: { artistId: artist.id }, orderBy: { createdAt: "desc" }, take: 8 }),
    recipientsFor(artist.id, "ALL"),
    recipientsFor(artist.id, "SUPERFANS"),
  ]);
  const t = s.totals;
  const e = s.engagement;
  const weekUsed = announcements.filter((a) => a.createdAt.getTime() > Date.now() - 7 * 86_400_000).length;
  const hasPending = announcements.some((a) => a.status === "PENDING");

  return (
    <main className="page-width utility-page artist-dash">
      <p className="eyebrow">ARTIST DASHBOARD</p>
      <div className="ad-head">
        <h1>{artist.name}</h1>
        <form action={artistLogout}><button className="button button-outline" type="submit">Sign out</button></form>
      </div>
      {artists.length > 1 && (
        <nav className="ad-switch" aria-label="Your artist profiles">
          <Link href="/artist?a=all">All artists</Link>
          {artists.map((x) => <Link key={x.id} href={`/artist?a=${x.id}`} aria-current={x.id === artist.id ? "page" : undefined}>{x.name}</Link>)}
        </nav>
      )}

      <section className="ad-cards" aria-label="Summary">
        <div><span>Plays, last {s.windowDays} days</span><b>{t.plays30.toLocaleString("en-NG")}</b><small>{t.playsAllTime.toLocaleString("en-NG")} all time</small></div>
        <div><span>Listeners, last {s.windowDays} days</span><b>{t.listeners30.toLocaleString("en-NG")}</b><small>different people</small></div>
        <div><span>Sales, last {s.windowDays} days</span><b>{t.sales30}</b><small>{t.salesAllTime} all time</small></div>
        <div><span>Sales value, last {s.windowDays} days</span><b>{formatNaira(t.revenue30Kobo)}</b><small>{formatNaira(t.revenueAllTimeKobo)} all time, before fees and payout share</small></div>
      </section>

      <section className="ad-block">
        <h2>How people listen</h2>
        {e.starts === 0 ? (
          <p className="ad-empty">Listening detail starts filling in now. It shows how long fans stay, whether they finish, and who comes back.</p>
        ) : (
          <div className="ad-cards">
            <div><span>Stayed 30 seconds or more</span><b>{e.reachedPct === null ? "—" : `${e.reachedPct}%`}</b><small>{e.reachedPct === null ? "Needs 10 or more listens" : `of ${e.starts} listens`}</small></div>
            <div><span>Finished the full track</span><b>{e.finishedPct === null ? "—" : `${e.finishedPct}%`}</b><small>{e.finishedPct === null ? "Needs 10 or more full listens" : `of ${e.fullListens} full listens`}</small></div>
            <div><span>Came back on another day</span><b>{e.repeatPct === null ? "—" : `${e.repeatPct}%`}</b><small>{e.repeatPct === null ? "Needs 10 or more listeners" : `${e.repeatListeners} of ${e.listeners} listeners`}</small></div>
            <div><span>Where people usually stop</span><b>{e.typicalDropoffSeconds === null ? "—" : mmss(e.typicalDropoffSeconds)}</b><small>{e.typicalDropoffSeconds === null ? "Needs more full listens" : "for those who leave before the end"}</small></div>
          </div>
        )}
        <p className="ad-note">Measured from how long the player really played, over the last {s.windowDays} days. A play on the Plays chart counts after 30 seconds.</p>
      </section>

      <section className="ad-block">
        <h2>Plays per day</h2>
        <Bars data={s.playSeries} label="Plays per day" />
        <h2>Sales per day</h2>
        <Bars data={s.saleSeries} label="Sales per day" />
        <p className="ad-note">One listener counts once per track per day.</p>
      </section>

      <div className="ad-two">
        <section className="ad-block">
          <h2>Where people listen</h2>
          <Places rows={s.playPlaces} total={t.plays30} empty="Location appears for plays from now on." />
        </section>
        <section className="ad-block">
          <h2>Where people buy</h2>
          <Places rows={s.salePlaces} total={t.salesAllTime} empty="No sales yet." />
        </section>
      </div>
      <p className="ad-note">Locations come from the visitor&apos;s internet connection, so they are approximate and can be off on mobile data. Activity before this dashboard launched has no location.</p>

      <section className="ad-block">
        <h2>Your tracks</h2>
        {s.perTrack.length === 0 ? <p className="ad-empty">No tracks uploaded yet.</p> : (
          <div className="ad-table" role="table" aria-label="Tracks">
            <div role="row" className="ad-row ad-hd ad-tracks"><span>Track</span><span>Plays (30d)</span><span>Stayed 30s</span><span>Finished</span><span>Sales</span><span>Value</span></div>
            {s.perTrack.map((r) => (
              <div role="row" className="ad-row ad-tracks" key={r.id}>
                <span>{r.title}{!r.live && <em> (draft)</em>}{r.exclusive && <em> (superfan exclusive)</em>}</span>
                <span>{r.plays30}</span><span>{r.reachedPct === null ? "—" : `${r.reachedPct}%`}</span><span>{r.finishedPct === null ? "—" : `${r.finishedPct}%`}</span>
                <span>{r.sales}</span><span>{formatNaira(r.revenueKobo)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ad-block">
        <h2>Your fans</h2>
        {s.fans.length === 0 ? <p className="ad-empty">Fans appear here when someone buys a track. Anyone who buys 3 or more different tracks is a Superfan, and unlocks your superfan exclusives.</p> : (
          <>
            <p className="ad-fansum">
              <b>{s.fans.filter((f) => f.tier === "Superfan").length}</b> Superfans · <b>{s.fans.filter((f) => f.tier === "Repeat buyer").length}</b> repeat buyers · <b>{s.fans.filter((f) => f.tier === "New fan").length}</b> new fans
            </p>
            <div className="ad-table" role="table" aria-label="Fans ranked by spend">
              <div role="row" className="ad-row ad-hd ad-fans"><span>Fan</span><span>Level</span><span>Tracks</span><span>Spent</span><span>Last bought</span></div>
              {s.fans.slice(0, 50).map((f, i) => (
                <div role="row" className="ad-row ad-fans" key={i}>
                  <span>{f.name}<small className="ad-mail">{f.email ? <a href={`mailto:${f.email}`}>{f.email}</a> : "Email kept private"} · {f.place}</small></span>
                  <span><i className={`ad-tier ${f.tier === "Superfan" ? "gold" : ""}`}>{f.tier}</i></span>
                  <span>{f.tracks}</span><span>{formatNaira(f.spentKobo)}</span><span>{when(f.lastAt)}</span>
                </div>
              ))}
            </div>
            <p><a className="button button-outline" href={`/api/artist/fans?a=${artist.id}`}>Download fans with emails (CSV)</a></p>
          </>
        )}
        <p className="ad-note">Ranked by money spent. Emails are shown only for buyers who did not choose to keep them private. Please use them only to thank fans and share your music, and never sell or pass them on.</p>
      </section>

      <section className="ad-block" id="message-fans">
        <h2>Message your fans</h2>
        {q.announced === "1" && <p className="form-message" role="status">Sent for review. Fish Guy approves it before it goes out, usually within a day.</p>}
        {q.error && <p className="form-message is-error" role="alert">{q.error}</p>}
        <p className="ad-note">{allFans.length} fans can be emailed, and {superfans.length} of them are Superfans. Fans who kept their email private, or unsubscribed, are never included. Every email has an unsubscribe link. You can send {MAX_PER_WEEK} a week.</p>
        {allFans.length > 0 && !hasPending && weekUsed < MAX_PER_WEEK && (
          <form action={submitAnnouncement} className="account-card">
            <input type="hidden" name="artistId" value={artist.id} />
            <label>Who gets it
              <select name="audience" defaultValue="ALL">
                <option value="ALL">All fans who can be emailed ({allFans.length})</option>
                <option value="SUPERFANS">Superfans only ({superfans.length})</option>
              </select>
            </label>
            <label>Subject<input name="subject" maxLength={100} required /></label>
            <label>Message<textarea name="body" rows={6} minLength={20} maxLength={1500} required /></label>
            <label>Link (optional, must start with https://)<input name="linkUrl" maxLength={300} placeholder="https://" /></label>
            <button className="button button-gold" type="submit">Send for review</button>
          </form>
        )}
        {hasPending && <p className="ad-note">You have an announcement waiting for review.</p>}
        {announcements.length > 0 && (
          <div className="ad-table" role="table" aria-label="Your announcements">
            {announcements.map((a) => (
              <div role="row" className="ad-row" key={a.id}>
                <span>{a.subject}</span><span>{a.status.toLowerCase()}</span><span>{a.status === "SENT" ? `${a.recipientCount} sent` : a.reviewNote ?? ""}</span><span>{when(a.sentAt ?? a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="ad-block">
        <h2>Recent buyers</h2>
        {s.recentSales.length === 0 ? <p className="ad-empty">When someone buys a track, they appear here.</p> : (
          <div className="ad-table" role="table" aria-label="Recent buyers">
            <div role="row" className="ad-row ad-hd ad-buyers"><span>Buyer</span><span>Track</span><span>From</span><span>Date</span><span>Paid</span></div>
            {s.recentSales.map((r, i) => (
              <div role="row" className="ad-row ad-buyers" key={i}>
                <span>{r.buyer}</span>
                <span>{r.track}{r.editionNo ? ` (No. ${r.editionNo})` : ""}</span><span>{r.place}</span><span>{when(r.when)}</span><span>{formatNaira(r.amountKobo)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="ad-note">Buyers are shown by first name and approximate location only. Emails are in the fans list above, for buyers who did not keep theirs private.</p>
      </section>
    </main>
  );
}
