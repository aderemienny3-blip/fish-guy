import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/shop/add-to-cart";
import { CartonButton } from "@/components/shop/carton-button";
import { ProductImage, stockLabel } from "@/components/shop/product-card";
import { getProductBySlug } from "@/lib/shop/data";
import { getAddOns } from "@/lib/shop/addons";
import { AddOnShelf } from "@/components/shop/addon-shelf";
import { naira } from "@/lib/shop/format";
import { JsonLd } from "@/components/seo/json-ld";
import { productJsonLd } from "@/lib/seo";
import { ReviewsSection } from "@/components/shop/reviews-section";
import { WhatsAppLink } from "@/components/shop/whatsapp-chat";
import { getReviewSummary } from "@/lib/reviews";
import { PixelEvent } from "@/components/track/pixel-event";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ productSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productSlug } = await params;
  const p = await getProductBySlug(productSlug);
  return p ? { title: `${p.name} | Fish Guy`, description: `${p.name}, ${naira(p.priceKobo)} per ${p.unit}. Frozen food delivery in Lagos.`, alternates: { canonical: `/shop/${p.slug}` }, openGraph: { title: p.name, images: p.imageUrl ? [p.imageUrl] : undefined } } : { title: "Product not found | Fish Guy" };
}

export default async function ProductPage({ params }: Props) {
  const { productSlug } = await params;
  const p = await getProductBySlug(productSlug);
  if (!p) notFound();
  const rating = await getReviewSummary(p.id);
  const low = stockLabel(p);
  const addOns = p.isAddOn ? [] : await getAddOns();

  return (
    <main className="page-width product-page">
      <JsonLd data={productJsonLd(p, rating)} />
      <PixelEvent event="ViewContent" data={{ content_ids: [p.id], content_name: p.name, content_type: "product", value: p.priceKobo / 100, currency: "NGN" }} />
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link href="/shop">Shop</Link>
        {p.category && p.categorySlug && (<><span aria-hidden="true">/</span><Link href={`/category/${p.categorySlug}`}>{p.category}</Link></>)}
        <span aria-hidden="true">/</span><span>{p.name}</span>
      </nav>
      <section className="product-detail">
        <div className="product-detail-media">
          <ProductImage src={p.imageUrl} alt={p.name} />
          {p.mostOrdered && <span className="sticker sticker-earned">Most ordered</span>}
        </div>
        <div className="product-detail-info">
          {p.category && <p className="eyebrow">{p.category}</p>}
          <h1>{p.name}</h1>
          <p className="product-detail-price">{naira(p.priceKobo)} <span>per {p.unit}</span></p>
          {p.description && <p className="product-detail-description">{p.description}</p>}
          {p.sizeGuide && <p className="product-detail-description product-size-guide"><strong>Size guide:</strong> {p.sizeGuide}</p>}
          {low && <p className={`product-stock ${p.stockQty <= 0 ? "is-out" : ""}`}>{low}</p>}
          <AddToCart product={p} withQuantity />
          {p.cartonKg && p.unit === "kg" && <CartonButton product={p} cartonKg={p.cartonKg} />}
          <WhatsAppLink text={`Hello Fish Guy, I have a question about ${p.name}.`} label="Ask about this on WhatsApp" />
          <ul className="product-facts">
            <li>Delivered cold across Lagos (except Ikorodu) and selected Ogun campuses</li>
            <li>Choose your day and time slot at checkout</li>
            <li>Prices may change with supply</li>
          </ul>
        </div>
      </section>
      <ReviewsSection productId={p.id} />
      <AddOnShelf items={addOns} title="Goes well with this" note="Add ponmo, plantain and more in one tap." />
    </main>
  );
}
