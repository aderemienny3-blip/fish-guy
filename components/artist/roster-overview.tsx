import Link from "next/link";
import { artistStats } from "@/lib/artist-stats";
import { formatNaira } from "@/lib/money";

const MAX_ROSTER = 25;

/** One page for a label or manager: every artist on their email, side by side, with the totals. */
export async function RosterOverview({ artists }: { artists: { id: string; name: string }[] }) {
  const shown = artists.slice(0, MAX_ROSTER);
  const rows = await Promise.all(shown.map(async (a) => {
    const s = await artistStats(a.id);
    return {
      id: a.id, name: a.name, window: s.windowDays,
      plays: s.totals.plays30, sales: s.totals.sales30, revenue: s.totals.revenue30Kobo, revenueAll: s.totals.revenueAllTimeKobo,
      fans: s.fans.length, superfans: s.fans.filter((f) => f.tier === "Superfan").length, live: s.perTrack.filter((t) => t.live).length,
    };
  }));
  const sum = (k: "plays" | "sales" | "revenue" | "revenueAll" | "fans" | "superfans" | "live") => rows.reduce((n, r) => n + r[k], 0);
  const days = rows[0]?.window ?? 30;
  const top = [...rows].sort((a, b) => b.revenueAll - a.revenueAll || b.plays - a.plays)[0];

  return (
    <>
      <section className="ad-cards" aria-label="Roster totals">
        <div><span>Artists</span><b>{artists.length}</b><small>{sum("live")} tracks live</small></div>
        <div><span>Plays, last {days} days</span><b>{sum("plays").toLocaleString("en-NG")}</b><small>across the roster</small></div>
        <div><span>Sales, last {days} days</span><b>{sum("sales")}</b><small>{formatNaira(sum("revenue"))}</small></div>
        <div><span>Sales value, all time</span><b>{formatNaira(sum("revenueAll"))}</b><small>{top && top.revenueAll > 0 ? `Top earner: ${top.name}` : "before fees and payout share"}</small></div>
      </section>
      <section className="ad-block">
        <h2>Your artists</h2>
        <div className="ad-table" role="table" aria-label="Artists on your roster">
          <div role="row" className="ad-row ad-hd ad-tracks"><span>Artist</span><span>Plays ({days}d)</span><span>Sales ({days}d)</span><span>Value ({days}d)</span><span>Fans</span><span>Superfans</span></div>
          {rows.map((r) => (
            <div role="row" className="ad-row ad-tracks" key={r.id}>
              <span><Link href={`/artist?a=${r.id}`}>{r.name}</Link></span>
              <span>{r.plays.toLocaleString("en-NG")}</span><span>{r.sales}</span><span>{formatNaira(r.revenue)}</span><span>{r.fans}</span><span>{r.superfans}</span>
            </div>
          ))}
        </div>
        {artists.length > MAX_ROSTER && <p className="ad-note">Showing the first {MAX_ROSTER} of {artists.length} artists. Open an artist from the menu above to see the rest.</p>}
        <p className="ad-note">Open an artist to see their listeners, locations, fans and announcements. Each fan is counted once per artist.</p>
      </section>
    </>
  );
}
