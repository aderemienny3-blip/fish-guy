import Link from "next/link";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/customer";
import { BusinessForm, type BizProduct } from "./business-form";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Frozen food for restaurants, hotels and shops in Lagos | Fish Guy",
  description: "Order frozen fish, turkey and chicken in bulk for your kitchen, restaurant, hotel or shop in Lagos. Set your quantities once, save your regular list, and reorder in a tap.",
  alternates: { canonical: "/business" },
};
const MAX_QTY = 200;

export default async function BusinessPage() {
  const customer = await getCustomer();
  const [rows, regulars] = await Promise.all([
    db.product.findMany({ where: { active: true, isAddOn: false, stockQty: { gt: 0 } }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    customer ? db.regularItem.findMany({ where: { customerId: customer.id } }) : Promise.resolve([]),
  ]);
  const products: BizProduct[] = rows.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, priceKobo: p.priceKobo, unit: p.unit, imageUrl: p.imageUrl,
    category: p.category, maxQty: Math.min(p.stockQty, MAX_QTY),
  }));
  const initial = Object.fromEntries(regulars.map((r) => [r.productId, r.quantity]));

  return (
    <main className="page-width utility-page biz-page">
      <p className="eyebrow">FOR KITCHENS, HOTELS AND SHOPS</p>
      <h1>Order for your business</h1>
      <p className="utility-intro">Put in your quantities, add them to your cart, and pay on the checkout page. Save the list and next week is one tap. Prices and stock are live; the final price is confirmed when you pay.</p>
      {products.length === 0 ? (
        <p className="account-note">Nothing is in stock to order right now. <Link href="/shop">See the shop</Link>.</p>
      ) : (
        <BusinessForm products={products} initial={initial} signedIn={!!customer} />
      )}
    </main>
  );
}
