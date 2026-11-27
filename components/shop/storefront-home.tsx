import Link from "next/link";
import { ArrowRight, Beef, Clock3, CookingPot, Drumstick, Fish, MapPin, Package, Shell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { MusicTrack } from "@/lib/music/data";
import type { ShopProduct } from "@/lib/shop/data";
import { FreeStreamStrip } from "@/components/shop/free-stream-strip";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import { PlayMusicButton } from "@/components/music/play-music-button";
import { ProductCard } from "@/components/shop/product-card";
import { SponsoredStrip } from "@/components/ads/sponsored-strip";
import type { AdView } from "@/lib/ads/data";
import { HomeHeroArt } from "@/components/shop/home-hero-art";
import { DEFAULT_HERO, type Hero } from "@/lib/site-hero";

const iconFor = (label: string): LucideIcon => {
  const l = label.toLowerCase();
  if (l.includes("fish")) return Fish;
  if (l.includes("chicken")) return Drumstick;
  if (l.includes("turkey") || l.includes("meat") || l.includes("beef")) return Beef;
  if (l.includes("shrimp") || l.includes("prawn")) return Shell;
  return Package;
};

const deliverySteps = [
  { title: "Choose your area", detail: "We deliver across Lagos (except Ikorodu) and selected Ogun campuses.", icon: MapPin },
  { title: "Choose a time slot", detail: "Pick a day and slot between 8:30 AM and 9:00 PM.", icon: Clock3 },
  { title: "Pay in naira", detail: "Pay securely in naira by card, transfer or USSD.", icon: CookingPot },
];

export function StorefrontHome({
  products,
  categories,
  freeTracks,
  sponsored = null,
  hero = DEFAULT_HERO,
  heroAd = null,
  studentPercent = 0,
  bundles = null,
}: {
  products: ShopProduct[];
  categories: { label: string; slug: string; count: number }[];
  freeTracks: MusicTrack[];
  sponsored?: AdView | null;
  hero?: Hero;
  heroAd?: AdView | null;
  studentPercent?: number;
  bundles?: ReactNode;
}) {
  return (
    <main className="page-width shop-home">
      <section className="shop-hero" aria-labelledby="shop-title">
        <div className="shop-hero-copy">
          <p className="eyebrow">FISH GUY · FROZEN FOOD, LAGOS</p>
          <h1 id="shop-title">Good food,<br />kept cold.<br /><em>Delivered across Lagos.</em></h1>
          <p className="shop-hero-description">Frozen fish, turkey and chicken, priced per kg. Pick a delivery slot that works for you and we bring it cold to your door.</p>
          <div className="hero-cta-row">
            <Link href="/shop" className="button button-gold">Order now <ArrowRight aria-hidden="true" /></Link>
            <PlayMusicButton variant="hero" />
          </div>
          <p className="delivery-note">Delivery across Lagos (except Ikorodu) and selected Ogun campuses. Open every day, 8:30 AM to 9:00 PM.</p>
        </div>
        <div className="shop-hero-art">
          <HomeHeroArt hero={hero} ad={heroAd} />
        </div>
      </section>

      {studentPercent > 0 && (
        <Link href="/student" className="student-banner">
          <strong>Students in Lagos save {studentPercent}%</strong>
          <span>Universities, polytechnics and colleges of education. Verify once and save on every order.</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      )}

      {sponsored && <SponsoredStrip ad={sponsored} />}

      {categories.length > 0 && (
        <section className="shop-section category-section" id="categories" aria-labelledby="categories-title">
          <div className="shop-section-heading">
            <div><p className="eyebrow">FIND YOUR FAVOURITES</p><h2 id="categories-title">Shop by category</h2></div>
            <Link href="/shop" className="text-link">Browse all <ArrowRight aria-hidden="true" /></Link>
          </div>
          <div className="category-grid">
            {categories.map(({ label, slug }) => {
              const Icon = iconFor(label);
              return (
                <Link className="category-card" href={`/shop?category=${slug}`} key={slug}>
                  <span className="category-icon"><Icon aria-hidden="true" /></span>
                  <span>{label}</span>
                  <ArrowRight className="category-arrow" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {bundles}

      <section className="shop-section product-section" id="products" aria-labelledby="products-title">
        <div className="shop-section-heading">
          <div><p className="eyebrow">FROM OUR FREEZER TO YOUR TABLE</p><h2 id="products-title">Frozen food</h2></div>
          <Link href="/shop" className="text-link">Shop all <ArrowRight aria-hidden="true" /></Link>
        </div>
        {products.length > 0 ? (
          <div className="product-grid">{products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : (
          <ShopEmptyState title="Stock is being updated" description="Our products will appear here as soon as they are in stock. Please check back shortly." />
        )}
      </section>

      <section className="shop-section delivery-section" aria-labelledby="delivery-title">
        <div className="shop-section-heading">
          <div><p className="eyebrow">SIMPLE FROM START TO DOOR</p><h2 id="delivery-title">How delivery works</h2></div>
        </div>
        <ol className="delivery-steps">
          {deliverySteps.map(({ title, detail, icon: Icon }, i) => (
            <li className="delivery-step" key={title}>
              <span className="step-number">0{i + 1}</span>
              <Icon className="step-icon" aria-hidden="true" />
              <h3>{title}</h3>
              <p>{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <FreeStreamStrip tracks={freeTracks} />
    </main>
  );
}
