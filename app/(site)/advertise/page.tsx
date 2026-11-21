import { db } from "@/lib/db";
import { BookingForm } from "@/components/ads/booking-form";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import { MAX_DAYS_AHEAD, addDays, lagosNow } from "@/lib/delivery";
import type { Placement } from "@/lib/ads/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Advertise your music | Fish Guy", description: "Put your music in front of Lagos shoppers with popups, sponsored stickers and featured placements." };

export default async function AdvertisePage() {
  const [packages, tracks] = await Promise.all([
    db.adPackage.findMany({ where: { active: true }, orderBy: [{ priceKobo: "asc" }] }),
    db.track.findMany({ where: { isPublished: true }, orderBy: { title: "asc" }, select: { id: true, title: true, artist: { select: { name: true } } } }),
  ]);
  const today = lagosNow().date;

  return (
    <main className="page-width utility-page">
      <p className="eyebrow">FISH GUY ADS</p>
      <h1>Put your music in front of Lagos</h1>
      <p className="utility-intro">
        Every day people across Lagos shop with Fish Guy. Book a placement for your song, send your ad for review, and pay only once it is approved.
        You will see real numbers while it runs: how many different people saw it and how many clicked.
      </p>
      <ol className="delivery-steps student-steps">
        <li className="delivery-step"><span className="step-number">01</span><h3>Pick and send</h3><p>Choose a package, add your artwork and link.</p></li>
        <li className="delivery-step"><span className="step-number">02</span><h3>We review</h3><p>We check every ad. You get an email either way.</p></li>
        <li className="delivery-step"><span className="step-number">03</span><h3>Pay and go live</h3><p>Pay securely with Paystack and your ad runs on your dates.</p></li>
      </ol>
      {packages.length === 0 ? (
        <ShopEmptyState title="Ad packages are being set up" description="Booking opens very soon. Please check back shortly." actionHref="/sounds" actionLabel="Listen to Fish Guy Sounds" />
      ) : (
        <BookingForm
          packages={packages.map((p) => ({ id: p.id, name: p.name, placement: p.placement as Placement, priceKobo: p.priceKobo, durationDays: p.durationDays, description: p.description }))}
          tracks={tracks.map((t) => ({ id: t.id, title: t.title, artistName: t.artist.name }))}
          today={today}
          lastDay={addDays(today, MAX_DAYS_AHEAD)}
        />
      )}
    </main>
  );
}
