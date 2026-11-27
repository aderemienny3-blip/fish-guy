import { ensureArtistLink, linkResults } from "@/lib/link-stats";
import { siteUrl } from "@/lib/seo";
import { formatNaira } from "@/lib/money";

/** The artist's own link and what it has brought in. */
export async function ArtistLinkCard({ artist }: { artist: { id: string; slug: string; name: string } }) {
  const link = await ensureArtistLink(artist).catch(() => null);
  if (!link) return null;
  const r = await linkResults(link.code);
  const url = `${siteUrl()}/go/${link.code}`;
  return (
    <section className="ad-block" id="my-link">
      <h2>Your link</h2>
      <p>Share this link in your bio and posts. We count every click and every purchase that comes from it, for 30 days after someone taps it.</p>
      <p><strong>{url}</strong></p>
      <section className="ad-cards" aria-label="Link results">
        <div><span>Clicks</span><b>{r.clicks.toLocaleString("en-NG")}</b><small>{r.lastClick ? "last " + r.lastClick.toLocaleDateString("en-NG") : "none yet"}</small></div>
        <div><span>Visitors</span><b>{r.visitors.toLocaleString("en-NG")}</b><small>different people a day</small></div>
        <div><span>Track sales</span><b>{r.musicOrders}</b><small>{formatNaira(r.musicKobo)}</small></div>
      </section>
      {r.clicks === 0 && <p className="account-note">No clicks yet. Results appear here as people use your link.</p>}
    </section>
  );
}
