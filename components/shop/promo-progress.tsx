"use client";

import Link from "next/link";
import { Gift } from "lucide-react";
import { useCart } from "@/components/shop/cart";
import { useFestive } from "@/components/shop/use-festive";
import { cartonsOf, evaluatePromo, plural, rewardText } from "@/lib/festive-math";

/** Shows in the cart: how close the customer is to the festive gift or discount. Hidden unless a deal is live and the cart has cartons. */
export function PromoProgress() {
  const { lines, isOpen } = useCart();
  const data = useFestive(isOpen ? "open" : undefined);
  if (!data?.promo) return null;
  const kg = new Map(data.cartonProducts.map((p) => [p.id, p.cartonKg]));
  const priced = lines.map((l) => ({ qty: l.qty, cartonKg: kg.get(l.productId) ?? null, value: l.priceKobo * l.qty }));
  const cartons = cartonsOf(priced);
  if (cartons === 0) return null;
  const value = priced.reduce((n, l) => n + (l.cartonKg ? l.value : 0), 0);
  const out = evaluatePromo(data.promo, cartons, value);
  const reward = rewardText(data.promo);
  const unlocked = [out.gift ? `free ${out.gift}` : null, out.discountKobo > 0 || out.freeDelivery ? reward : null].filter(Boolean);

  return (
    <section className="promo-progress" aria-label="Festive carton deal">
      <Gift aria-hidden="true" />
      <div>
        <strong>{data.promo.title}: {plural(cartons, "carton")} in your cart</strong>
        {unlocked.length > 0 && <p className="promo-unlocked">Unlocked: {unlocked.join(" and ")}.</p>}
        {out.nudge && <p>{out.nudge}</p>}
        <Link href="/festive">See the deal</Link>
      </div>
    </section>
  );
}
