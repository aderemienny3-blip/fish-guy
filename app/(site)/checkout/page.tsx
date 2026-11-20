import { db } from "@/lib/db";
import { CheckoutClient } from "@/components/shop/checkout-client";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import { getStudentRules } from "@/lib/student";
import { getActivePromo } from "@/lib/festive";
import { BUSINESS } from "@/lib/business";
import { MAX_DAYS_AHEAD, addDays, lagosNow } from "@/lib/delivery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout | Fish Guy" };

export default async function CheckoutPage() {
  const [rules, allZones, slots, promo] = await Promise.all([
    getStudentRules(),
    db.deliveryZone.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.deliverySlot.findMany({ where: { active: true }, orderBy: { startMinute: "asc" } }),
    getActivePromo(),
  ]);
  const zones = allZones.filter((z) => !z.isPickup);
  const pickupZone = allZones.find((z) => z.isPickup) ?? null;
  const today = lagosNow().date;

  return (
    <main className="page-width utility-page">
      <p className="eyebrow">SECURE CHECKOUT</p>
      <h1>{pickupZone ? "Delivery or pickup" : "Delivery details"}</h1>
      {(zones.length === 0 && !pickupZone) || slots.length === 0 ? (
        <ShopEmptyState
          title="Delivery is not open for booking yet"
          description="Delivery areas and time slots are still being set up. Please check back shortly."
          actionHref="/shop"
          actionLabel="Back to the shop"
        />
      ) : (
        <CheckoutClient
          zones={zones.map((z) => ({ id: z.id, name: z.name, feeKobo: z.feeKobo, freeOverKobo: z.freeOverKobo }))}
          slots={slots.map((s) => ({ id: s.id, label: s.label, startMinute: s.startMinute }))}
          student={{ percent: rules.percent, maxKobo: rules.maxKobo }}
          pickup={pickupZone ? { id: pickupZone.id, address: BUSINESS.address } : null}
          promo={promo}
          today={today}
          lastDay={addDays(today, MAX_DAYS_AHEAD)}
        />
      )}
    </main>
  );
}
