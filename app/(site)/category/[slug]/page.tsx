import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/shop/product-card";
import { getShopData } from "@/lib/shop/data";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { categories } = await getShopData(slug);
  const c = categories.find((x) => x.slug === slug);
  if (!c) return { title: "Category not found | Fish Guy" };
  const l = c.label.toLowerCase();
  return {
    title: `Buy frozen ${l} in Lagos | Fish Guy`,
    description: `Frozen ${l} delivered cold across Lagos. ${c.count} product${c.count === 1 ? "" : "s"} available. Pay securely with Paystack.`,
    alternates: { canonical: `/category/${c.slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const { products, categories } = await getShopData(slug);
  const c = categories.find((x) => x.slug === slug);
  if (!c) notFound();
  return (
    <main className="page-width shop-listing-page">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/shop">Shop</Link><span aria-hidden="true">/</span><span>{c.label}</span></nav>
      <p className="eyebrow">FISH GUY · FROZEN FOOD, LAGOS</p>
      <div className="shop-listing-heading">
        <div><h1>Frozen {c.label.toLowerCase()} in Lagos</h1><p>Delivered cold across Lagos, except Ikorodu. Choose your day and time slot at checkout.</p></div>
      </div>
      <nav className="shop-filter-list" aria-label="Product categories">
        <Link href="/shop">All products</Link>
        {categories.map((x) => <Link href={`/category/${x.slug}`} key={x.slug} aria-current={x.slug === slug ? "page" : undefined}>{x.label}</Link>)}
      </nav>
      <section aria-label="Products">
        <div className="product-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      </section>
    </main>
  );
}
