"use client";

import { useCart } from "@/components/shop/cart";
import { naira } from "@/lib/shop/format";
import { MAX_QTY } from "@/lib/festive-math";

type P = { id: string; slug: string; name: string; priceKobo: number; unit: string; imageUrl: string | null; stockQty: number };

/** One tap adds a whole carton (for example 20 kg of fish) to the cart. */
export function CartonButton({ product, cartonKg, compact = false }: { product: P; cartonKg: number; compact?: boolean }) {
  const { add, setOpen, lines } = useCart();
  if (product.unit !== "kg" || cartonKg <= 0) return null;
  const maxQty = Math.min(product.stockQty, MAX_QTY);
  const inCart = lines.find((l) => l.productId === product.id)?.qty ?? 0;
  const soldOut = product.stockQty < cartonKg;
  const full = inCart + cartonKg > maxQty;

  return (
    <button
      type="button"
      className={`button ${compact ? "button-gold" : "button-outline"} carton-button`}
      disabled={soldOut || full}
      onClick={() => {
        add({ productId: product.id, slug: product.slug, name: product.name, priceKobo: product.priceKobo, unit: product.unit, imageUrl: product.imageUrl, maxQty }, cartonKg);
        setOpen(true);
      }}
    >
      {soldOut ? "Carton sold out" : full ? "Max in cart" : `Add 1 carton (${cartonKg} kg) · ${naira(product.priceKobo * cartonKg)}`}
    </button>
  );
}
