import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getArtistEmail } from "@/lib/artist-auth";
import { artistStats } from "@/lib/artist-stats";
import { share } from "@/lib/artist-math";
import { formatNaira } from "@/lib/money";
import { artistLogout } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Artist dashboard | Fish Guy Sounds", robots: { index: false } };

const when = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }).format(d) : "");

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

export default async function ArtistDashboard({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const email = await getArtistEmail();
  if (!email) redirect("/artist/login");
  const { a } = await searchParams;
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
  const artist = artists.find((x) => x.id === a) ?? artists[0];
  const s = await artistStats(artist.id);
  const t = s.totals;

  return (
    <main className="page-width utility-page artist-dash">
      <p className="eyebrow">ARTIST DASHBOARD</p>
      <div className="ad-head">
        <h1>{artist.name}</h1>
        <form action={artistLogout}><button className="button button-outline" type="submit">Sign out</button></form>
      </div>
      {artists.length > 1 && (
        <nav className="ad-switch" aria-label="Your artist profiles">
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
            <div role="row" className="ad-row ad-hd"><span>Track</span><span>Plays (30d)</span><span>Sales</span><span>Value</span></div>
            {s.perTrack.map((r) => (
              <div role="row" className="ad-row" key={r.id}>
                <span>{r.title}{!r.live && <em> (draft)</em>}</span><span>{r.plays30}</span><span>{r.sales}</span><span>{formatNaira(r.revenueKobo)}</span>
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
                <span>{r.buyer}{r.email && <small className="ad-mail"><a href={`mailto:${r.email}`}>{r.email}</a></small>}</span>
                <span>{r.track}</span><span>{r.place}</span><span>{when(r.when)}</span><span>{formatNaira(r.amountKobo)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="ad-note">Buyers are shown by first name and approximate location only. A buyer&apos;s email appears here only if they ticked the box allowing you to contact them.</p>
      </section>
    </main>
  );
}
