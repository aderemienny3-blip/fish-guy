import { db } from "@/lib/db";
import { naira } from "@/lib/shop/format";

/** One line on the shop page about delivery fees. Shows nothing until delivery areas are set up. */
export async function DeliveryNote() {
  const zones = await db.deliveryZone.findMany({ where: { active: true, isPickup: false }, select: { feeKobo: true, freeOverKobo: true } }).catch(() => []);
  if (zones.length === 0) return null;
  const min = Math.min(...zones.map((z) => z.feeKobo));
  const frees = zones.map((z) => z.freeOverKobo).filter((v): v is number => v !== null);
  return (
    <p className="delivery-note">
      Delivery from {naira(min)}, depending on your area.{frees.length > 0 ? ` Free delivery above ${naira(Math.min(...frees))} in some areas.` : ""} Your exact fee shows in the cart.
    </p>
  );
}
