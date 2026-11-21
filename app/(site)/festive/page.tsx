import Link from "next/link";
import { Gift, Percent, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { getActivePromo } from "@/lib/festive";
import { fmtShortDate, hasGift, hasReward, plural, rewardText } from "@/lib/festive-math";
import { naira } from "@/lib/shop/format";
import { ProductImage } from "@/components/shop/product-card";
import { CartonButton } from "@/components/shop/carton-button";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";

export const dynamic = "force-dynamic";
export const metadata = { title: "Festive carton deals | Fish Guy" };

export default async function FestivePage() {
  const promo = await getActivePromo();
  if (!promo) {
    return (
      <main className="page-width utility-page">
        <p className="eyebrow">FISH GUY</p>
        <h1>No festive deal right now</h1>
        <ShopEmptyState title="Check back soon" description="Our festive carton deals appear here when they are on." actionHref="/shop" actionLabel="Shop frozen food" />
      </main>
    );
  }

  const [products, pickup] = await Promise.all([
    db.product.findMany({ where: { active: true, unit: "kg", cartonKg: { not: null } }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    db.deliveryZone.findFirst({ where: { isPickup: true, active: true }, select: { id: true } }),
  ]);
  const cartons = products.flatMap((p) => (p.cartonKg && p.stockQty >= p.cartonKg ? [{ p, kg: p.cartonKg }] : []));
  const reward = rewardText(promo);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const share = `https://wa.me/?text=${encodeURIComponent(`${promo.title} at Fish Guy, until ${fmtShortDate(promo.endDate)}: ${site}/festive`)}`;
  const RewardIcon = promo.rewardType === "FREE_DELIVERY" ? Truck : Percent;

  return (
    <main className="page-width festive-page">
      <section className="festive-hero">
        <p className="eyebrow">FESTIVE SEASON · {fmtShortDate(promo.startDate)} to {fmtShortDate(promo.endDate)}</p>
        <h1>{promo.title}</h1>
        <p className="festive-lead">Stock up for the season. Buy frozen food by the carton and unlock more.</p>
        <ul className="festive-tiles">
          {hasGift(promo) && (
            <li>
              <Gift aria-hidden="true" />
              <strong>Buy {plural(promo.giftMinCartons, "carton")}</strong>
              <span>Get a free {promo.giftName}</span>
            </li>
          )}
          {hasReward(promo) && reward && (
            <li>
              <RewardIcon aria-hidden="true" />
              <strong>Buy {plural(promo.bigMinCartons, "carton")}</strong>
              <span>Get {reward}</span>
            </li>
          )}
        </ul>
        <div className="festive-hero-actions">
          <a href="#cartons" className="button button-gold">Choose your cartons</a>
          <a href={share} className="button button-outline" target="_blank" rel="noopener noreferrer">Share on WhatsApp</a>
        </div>
      </section>

      <section id="cartons" className="festive-section" aria-label="Cartons">
        <h2>Cartons</h2>
        <p className="festive-sub">Any mix of cartons counts. Pick the ones your family likes.</p>
        {cartons.length > 0 ? (
          <div className="product-grid">
            {cartons.map(({ p, kg }) => (
              <article className="product-card" key={p.id}>
                <Link href={`/shop/${p.slug}`} className="product-image-link"><ProductImage src={p.imageUrl} alt={p.name} /></Link>
                <div className="product-card-body">
                  {p.category && <p className="product-category">{p.category}</p>}
                  <Link href={`/shop/${p.slug}`} className="product-name">{p.name}</Link>
                  <p className="product-price">{naira(p.priceKobo * kg)} <span>/ {kg} kg carton</span></p>
                  <p className="product-stock">{naira(p.priceKobo)} per kg</p>
                  <CartonButton product={p} cartonKg={kg} compact />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <ShopEmptyState title="Cartons are being stocked" description="Carton products appear here as soon as they are in stock." actionHref="/shop" actionLabel="Shop by the kg" />
        )}
      </section>

      <section className="festive-section" aria-label="How it works">
        <h2>How it works</h2>
        <ol className="festive-steps">
          <li>Add cartons to your cart. Your cart shows how close you are to each reward.</li>
          <li>{pickup ? "Choose delivery across Lagos (except Ikorodu) or selected Ogun campus areas, or collect from our store." : "Choose your delivery day and time at checkout."}</li>
          <li>The gift and discount are added automatically when you pay.</li>
        </ol>
      </section>

      <section className="festive-terms" aria-label="Terms">
        <h3>The small print</h3>
        <ul>
          <li>Offer runs {fmtShortDate(promo.startDate)} to {fmtShortDate(promo.endDate)}, while stock lasts.</li>
          <li>A carton is the carton size shown on each product. Different products can be mixed.</li>
          {hasGift(promo) && <li>One free gift per order. Gifts are limited.</li>}
          {!promo.stackWithStudent && <li>Cannot be combined with the student discount. You get whichever is bigger.</li>}
        </ul>
      </section>
    </main>
  );
}
