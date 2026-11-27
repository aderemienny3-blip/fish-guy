import { getBundleCards } from "@/lib/bundles";
import { naira } from "@/lib/shop/format";
import { BundleAddButton } from "@/components/shop/bundle-add-button";

/** Bundles you set up in admin. Shows nothing when there are none in stock. */
export async function BundleShelf() {
  const bundles = await getBundleCards();
  if (bundles.length === 0) return null;
  return (
    <section className="shop-section bundle-shelf" id="bundles" aria-labelledby="bundles-title">
      <div className="shop-section-heading"><div><p className="eyebrow">ONE TAP, ONE PRICE</p><h2 id="bundles-title">Bundles</h2></div></div>
      <div className="bundle-grid">
        {bundles.map((b) => {
          const save = b.retailKobo - b.priceKobo;
          return (
            <article key={b.id} className="bundle-card">
              <h3>{b.name}</h3>
              {b.description && <p className="bundle-desc">{b.description}</p>}
              <ul className="bundle-items">{b.items.map((i) => <li key={i.productId}>{i.quantity} {i.unit === "kg" ? "kg" : "×"} {i.name}</li>)}</ul>
              <p className="bundle-price"><strong>{naira(b.priceKobo)}</strong>{save > 0 && <span> Worth {naira(b.retailKobo)}. You save {naira(save)}.</span>}</p>
              <BundleAddButton items={b.items} />
            </article>
          );
        })}
      </div>
      <p className="account-note">The saving is taken off at checkout when all the bundle&apos;s items are in your cart.</p>
    </section>
  );
}
