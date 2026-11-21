import Link from "next/link";
import { ProductCard } from "@/components/shop/product-card";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import { getShopData } from "@/lib/shop/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Shop frozen food | Fish Guy" };

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const { products, categories, hasAny, addOns } = await getShopData(category);
  const selected = categories.find((c) => c.slug === category);

  return (
    <main className="page-width shop-listing-page">
      <p className="eyebrow">FISH GUY · FROZEN FOOD, LAGOS</p>
      <div className="shop-listing-heading">
        <div><h1>{selected?.label ?? "Shop frozen food"}</h1><p>Prices are per kg. Delivery across Lagos (except Ikorodu) and selected Ogun campuses.</p></div>
        <Link href="/" className="text-link">Back to home</Link>
      </div>
      {(categories.length > 0 || addOns.length > 0) && (
        <nav className="shop-filter-list" aria-label="Product categories">
          <Link href="/shop" aria-current={!selected ? "page" : undefined}>All products</Link>
          {categories.map((c) => (
            <Link href={`/shop?category=${c.slug}`} aria-current={selected?.slug === c.slug ? "page" : undefined} key={c.slug}>{c.label}</Link>
          ))}
          {addOns.length > 0 && <a href="/shop#add-ons" className="filter-addons">Add-ons</a>}
        </nav>
      )}
      <section id="products" aria-label="Products">
        {products.length > 0 ? (
          <div className="product-grid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        ) : (
          <ShopEmptyState
            title={hasAny ? "Nothing in this category" : "Stock is being updated"}
            description={hasAny ? "Try another category or see everything we have." : "Products will appear here as soon as they are in stock."}
            actionHref={hasAny ? "/shop" : "/"}
            actionLabel={hasAny ? "See all products" : "Back to home"}
          />
        )}
      </section>
      {addOns.length > 0 && !selected && (
        <section id="add-ons" className="addon-section" aria-label="Add-ons">
          <h2>Add-ons</h2>
          <p>Ponmo, plantain and more. Add them to any order.</p>
          <div className="product-grid">{addOns.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </main>
  );
}
