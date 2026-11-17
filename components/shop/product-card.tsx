import Image from "next/image";
import Link from "next/link";
import { Fish } from "lucide-react";
import type { ShopProduct } from "@/lib/shop/data";
import { naira } from "@/lib/shop/format";
import { AddToCart } from "@/components/shop/add-to-cart";

export function stockLabel(p: Pick<ShopProduct, "stockQty" | "unit">) {
  if (p.stockQty <= 0) return "Sold out";
  if (p.stockQty <= 10) return `Only ${p.stockQty} ${p.unit} left`;
  return null;
}

export function ProductImage({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="product-image">
      {src ? <Image src={src} alt={alt} fill sizes="(max-width: 680px) 50vw, 280px" unoptimized /> : (
        <span className="product-image-empty" role="img" aria-label={`${alt}, photo coming soon`}><Fish aria-hidden="true" /><small>Photo coming soon</small></span>
      )}
    </div>
  );
}

export function ProductCard({ product }: { product: ShopProduct }) {
  const low = stockLabel(product);
  return (
    <article className="product-card">
      <Link href={`/shop/${product.slug}`} className="product-card-media" aria-label={`View ${product.name}`}>
        <ProductImage src={product.imageUrl} alt={product.name} />
        {product.mostOrdered && <span className="sticker sticker-earned">Most ordered</span>}
      </Link>
      <div className="product-card-body">
        {product.category && <p className="product-category">{product.category}</p>}
        <Link href={`/shop/${product.slug}`} className="product-name">{product.name}</Link>
        <p className="product-price">{naira(product.priceKobo)} <span>/ {product.unit}</span></p>
        {low && <p className={`product-stock ${product.stockQty <= 0 ? "is-out" : ""}`}>{low}</p>}
        <AddToCart product={product} />
      </div>
    </article>
  );
}
