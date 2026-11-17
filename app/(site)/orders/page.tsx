import { OrderLookup } from "@/components/shop/order-lookup";

export const metadata = { title: "Track your order | Fish Guy" };

export default function OrdersPage() {
  return (
    <main className="page-width utility-page">
      <p className="eyebrow">YOUR FISH GUY ORDER</p>
      <h1>Track your order</h1>
      <p className="utility-intro">Enter the order number from your payment confirmation to see where your order is.</p>
      <OrderLookup />
    </main>
  );
}
