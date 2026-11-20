"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/components/shop/cart";

type P = { id: string; slug: string; name: string; priceKobo: number; unit: string; imageUrl: string | null; stockQty: number };

const MAX_PER_ORDER = 200;

export function AddToCart({ product, withQuantity = false }: { product: P; withQuantity?: boolean }) {
  const { add, setOpen, lines } = useCart();
  const [qty, setQty] = useState(1);
  const maxQty = Math.min(product.stockQty, MAX_PER_ORDER);
  const inCart = lines.find((l) => l.productId === product.id)?.qty ?? 0;

  if (product.stockQty <= 0) return <button className="button button-outline" type="button" disabled>Sold out</button>;

  const addNow = () => {
    add(
      { productId: product.id, slug: product.slug, name: product.name, priceKobo: product.priceKobo, unit: product.unit, imageUrl: product.imageUrl, maxQty },
      withQuantity ? qty : 1,
    );
    setOpen(true);
  };

  return (
    <div className="add-to-cart">
      {withQuantity && (
        <div className="qty-stepper" aria-label="Quantity">
          <button type="button" aria-label="Decrease" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus aria-hidden="true" /></button>
          <output>{qty} {product.unit}</output>
          <button type="button" aria-label="Increase" disabled={qty >= maxQty} onClick={() => setQty((q) => Math.min(maxQty, q + 1))}><Plus aria-hidden="true" /></button>
        </div>
      )}
      <button className="button button-gold" type="button" disabled={inCart >= maxQty} onClick={addNow}>
        {inCart >= maxQty ? "Max in cart" : "Add to cart"}
      </button>
    </div>
  );
}
