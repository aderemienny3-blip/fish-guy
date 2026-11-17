import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Beef, Clock3, CookingPot, Drumstick, Fish, MapPin, Package, Shell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MusicTrack } from "@/lib/music/data";
import type { ShopProduct } from "@/lib/shop/data";
import { FreeStreamStrip } from "@/components/shop/free-stream-strip";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import { ProductCard } from "@/components/shop/product-card";

const iconFor = (label: string): LucideIcon => {
  const l = label.toLowerCase();
  if (l.includes("fish")) return Fish;
  if (l.includes("chicken")) return Drumstick;
  if (l.includes("turkey") || l.includes("meat") || l.includes("beef")) return Beef;
  if (l.includes("shrimp") || l.includes("prawn")) return Shell;
  return Package;
};

const deliverySteps = [
  { title: "Choose your area", detail: "We deliver across Lagos, except Ikorodu.", icon: MapPin },
  { title: "Choose a time slot", detail: "Pick a day and slot between 8:30 AM and 9:00 PM.", icon: Clock3 },
  { title: "Pay with Monnify", detail: "Pay securely in naira by card, transfer or USSD.", icon: CookingPot },
];

export function StorefrontHome({
  products,
  categories,
  freeTracks,
  studentPercent = 0,
}: {
  products: ShopProduct[];
  categories: { label: string; slug: string; count: number }[];
  freeTracks: MusicTrack[];
  studentPercent?: number;
}) {
  return (
    <main className="page-width shop-home">
      <section className="shop-hero" aria-labelledby="shop-title">
        <div className="shop-hero-copy">
          <p className="eyebrow">FISH GUY · FROZEN FOOD, LAGOS</p>
          <h1 id="shop-title">Good food,<br />kept cold.<br /><em>Delivered across Lagos.</em></h1>
          <p className="shop-hero-description">Frozen fish, turkey and chicken, priced per kg. Pick a delivery slot that works for you and we bring it cold to your door.</p>
          <Link href="/shop" className="button button-gold">Order now <ArrowRight aria-hidden="true" /></Link>
          <p className="delivery-note">Delivery across Lagos, except Ikorodu. Open every day, 8:30 AM to 9:00 PM.</p>
        </div>
        <div className="shop-hero-art">
          <Image src="/frozen-food-hero.png" alt="Vacuum-sealed frozen fish and prawns on crushed ice" fill priority sizes="(max-width: 680px) 100vw, 54vw" />
          <span className="hero-art-caption">FROZEN WITH CARE · LAGOS</span>
        </div>
      </section>

      {studentPercent > 0 && (
        <Link href="/student" className="student-banner">
          <strong>Students in Lagos save {studentPercent}%</strong>
          <span>Universities, polytechnics and colleges of education. Verify once and save on every order.</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      )}

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
