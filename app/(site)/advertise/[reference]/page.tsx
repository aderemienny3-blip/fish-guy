import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AdPayButton } from "@/components/ads/pay-button";
import { AD_REF, PLACEMENT_INFO, STATUS_LABEL, type Placement } from "@/lib/ads/labels";
import { adImageSrc } from "@/lib/ads/data";
import { confirmAdPayment } from "@/lib/ads/payments";
import { lagosNow } from "@/lib/delivery";
import { naira } from "@/lib/shop/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your ad | Fish Guy" };

const day = (iso: string) => new Intl.DateTimeFormat("en-NG", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso + "T00:00:00Z"));

export default async function AdStatusPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!AD_REF.test(reference)) notFound();

  const first = await db.adCampaign.findUnique({ where: { reference }, select: { paymentRef: true, status: true } });
  if (!first) notFound();
  // Artist returning from Paystack before the webhook arrives.
  if (first.status === "APPROVED" && first.paymentRef) { try { await confirmAdPayment(first.paymentRef); } catch { /* webhook will catch up */ } }

  const c = await db.adCampaign.findUniqueOrThrow({ where: { reference } });
  const today = lagosNow().date;
  const phase = c.status !== "PAID" ? null : today < c.startDate ? "scheduled" : today > c.endDate ? "ended" : "live";
  const [imp, clk] = c.status === "PAID"
    ? await Promise.all([db.adEvent.count({ where: { campaignId: c.id, type: "IMPRESSION" } }), db.adEvent.count({ where: { campaignId: c.id, type: "CLICK" } })])
    : [0, 0];
  const placement = PLACEMENT_INFO[c.placement as Placement];
  const img = adImageSrc(c.imagePath);

  return (
    <main className="page-width utility-page order-page">
      <p className="eyebrow">AD {c.reference}</p>
      <h1>{c.status === "PAID" ? (phase === "live" ? "Your ad is live" : phase === "ended" ? "Your ad has finished" : "Your ad is booked") : STATUS_LABEL[c.status]}</h1>

      {c.status === "SUBMITTED" && <p className="utility-intro">Thanks, {c.contactName.split(" ")[0]}. We will email you when we have reviewed it. You pay only after approval. Save this page and refresh to check.</p>}
      {c.status === "REJECTED" && <section className="order-card"><h2>Reason</h2><p>{c.rejectReason ?? "This ad could not be approved."}</p><p>You have not been charged. <Link href="/advertise">Book a new ad</Link>.</p></section>}
      {c.status === "APPROVED" && (
        <section className="order-card">
          <h2>Ready for payment</h2>
          <p>{c.packageName} · {naira(c.priceKobo)}. If your start date passes before you pay, the {c.durationDays} days start on the day you pay.</p>
          <AdPayButton reference={c.reference} label={`Pay ${naira(c.priceKobo)} securely`} />
        </section>
      )}

      <section className="order-card">
        <h2>{c.headline}</h2>
        {img && <p>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={img} alt="" width={140} height={140} style={{ borderRadius: 8, objectFit: "cover" }} /></p>}
        <p>{c.artistName}{c.tagline ? `. ${c.tagline}` : ""}</p>
        <p>{c.packageName} ({placement.label}) · {c.durationDays} day{c.durationDays === 1 ? "" : "s"}</p>
        <p>{day(c.startDate)} to {day(c.endDate)}</p>
      </section>

      {c.status === "PAID" && (
        <section className="order-card">
          <h2>Results so far</h2>
          {c.placement === "BAG_INSERT" ? (
            <p>Bag inserts are handed out with delivery bags, so there is no online count for them.</p>
          ) : (
            <>
              <dl className="ad-stats">
                <div><dt>People who saw it</dt><dd>{imp}</dd></div>
                <div><dt>People who clicked</dt><dd>{clk}</dd></div>
                <div><dt>Click rate</dt><dd>{imp > 0 ? `${((clk / imp) * 100).toFixed(1)}%` : "n/a"}</dd></div>
              </dl>
              <p className="field-note">Each person is counted once per day, so refreshing does not add to the numbers.</p>
            </>
          )}
        </section>
      )}
    </main>
  );
}
