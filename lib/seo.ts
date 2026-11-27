import { BUSINESS } from "@/lib/business";

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://fish-guy-kappa.vercel.app").replace(/\/+$/, "");

/** Drops empty values so the page never claims a fact you have not filled in lib/business.ts. */
function compact<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== undefined && v !== null)) as Partial<T>;
}

export function localBusinessJsonLd() {
  const phone = BUSINESS.phone || (BUSINESS.whatsapp ? "+" + BUSINESS.whatsapp : "");
  return compact({
    "@context": "https://schema.org",
    "@type": "Store",
    name: BUSINESS.name,
    description: "Frozen fish, turkey and chicken delivered across Lagos, with independent music from Fish Guy Sounds.",
    url: siteUrl(),
    image: siteUrl() + "/icons/icon-512.png",
    telephone: phone,
    email: BUSINESS.email,
    address: compact({ "@type": "PostalAddress", streetAddress: BUSINESS.address, addressLocality: "Lagos", addressCountry: "NG" }),
    areaServed: { "@type": "City", name: "Lagos" },
    sameAs: BUSINESS.instagram ? ["https://www.instagram.com/" + BUSINESS.instagram.replace(/^@/, "")] : "",
  });
}

export function productJsonLd(p: { name: string; slug: string; description: string | null; imageUrl: string | null; priceKobo: number; stockQty: number }, rating?: { count: number; avg: number }) {
  return compact({
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description ?? "",
    image: p.imageUrl ?? "",
    brand: { "@type": "Brand", name: BUSINESS.name },
    aggregateRating: rating && rating.count > 0 ? { "@type": "AggregateRating", ratingValue: rating.avg, reviewCount: rating.count } : "",
    offers: {
      "@type": "Offer",
      url: `${siteUrl()}/shop/${p.slug}`,
      priceCurrency: "NGN",
      price: (p.priceKobo / 100).toFixed(2),
      availability: p.stockQty > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  });
}
