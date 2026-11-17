import { db } from "@/lib/db";
import { CheckoutClient } from "@/components/shop/checkout-client";
import { ShopEmptyState } from "@/components/shop/shop-empty-state";
import { getStudentRules } from "@/lib/student";
import { MAX_DAYS_AHEAD, addDays, lagosNow } from "@/lib/delivery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout | Fish Guy" };

export default async function CheckoutPage() {
  const [rules, zones, slots] = await Promise.all([
    getStudentRules(),
    db.deliveryZone.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.deliverySlot.findMany({ where: { active: true }, orderBy: { startMinute: "asc" } }),
  ]);
  const today = lagosNow().date;

  return (
    <main className="page-width utility-page">
      <p className="eyebrow">SECURE CHECKOUT</p>
      <h1>Delivery details</h1>
      {zones.length === 0 || slots.length === 0 ? (
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
          today={today}
          lastDay={addDays(today, MAX_DAYS_AHEAD)}
        />
      )}
    </main>
  );
}
