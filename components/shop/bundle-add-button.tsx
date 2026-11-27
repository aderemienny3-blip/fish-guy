"use client";

import { useState } from "react";
import { useCart } from "@/components/shop/cart";
import type { BundleCard } from "@/lib/bundles";

/** Puts every item of the bundle in the cart at the bundle's quantities, then opens the cart. */
export function BundleAddButton({ items }: { items: BundleCard["items"] }) {
  const { add, remove, setOpen } = useCart();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="button button-gold"
      onClick={() => {
        for (const i of items) {
          remove(i.productId);
          add({ productId: i.productId, slug: i.slug, name: i.name, priceKobo: i.priceKobo, unit: i.unit, imageUrl: i.imageUrl, maxQty: i.maxQty }, i.quantity);
        }
        setDone(true);
        setOpen(true);
      }}
    >
      {done ? "Added. Add again" : "Add bundle to cart"}
    </button>
  );
}
