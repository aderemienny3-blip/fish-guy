"use client";

import { useState } from "react";
import { useCart } from "@/components/shop/cart";

export type ReorderLine = { productId: string; slug: string; name: string; priceKobo: number; unit: string; imageUrl: string | null; qty: number; maxQty: number };

/** Adds the available items from a past order to the cart at today's prices, then opens the cart. */
export function ReorderButton({ lines }: { lines: ReorderLine[] }) {
  const { add, setOpen } = useCart();
  const [done, setDone] = useState(false);
  if (lines.length === 0) return <span className="account-note">Nothing from this order is available right now.</span>;
  return (
    <button
      type="button"
      className="button button-gold"
      onClick={() => {
        for (const l of lines) add({ productId: l.productId, slug: l.slug, name: l.name, priceKobo: l.priceKobo, unit: l.unit, imageUrl: l.imageUrl, maxQty: l.maxQty }, l.qty);
        setDone(true);
        setOpen(true);
      }}
    >
      {done ? "Added. Add again" : "Reorder"}
    </button>
  );
}
