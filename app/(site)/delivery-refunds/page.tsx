import { LegalPage, Section } from "@/components/legal/legal-page";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Delivery, cold chain and refunds | Fish Guy" };

export default function DeliveryRefunds() {
  const h = BUSINESS.reportWindowHours;
  return (
    <LegalPage eyebrow="DELIVERY & REFUNDS" title="Delivery, cold chain and refunds" intro="How we deliver frozen food safely, and what we do if something is not right.">
      <Section title="Where and when we deliver">
        <p>We deliver across Lagos, except Ikorodu and its local council development areas, and to selected Ogun campus areas on set days (shown at checkout). You choose a delivery day and a time slot at checkout. Slots are available every day between 8:30 AM and 9:00 PM, and need at least 2 hours to pack your order.</p>
        <p>Delivery fees depend on your area and are shown before you pay. Some areas get free delivery above a set order value, shown at checkout when it applies.</p>
      </Section>
      <Section title="Keeping your food frozen">
        <p>Frozen products are packed to stay cold for delivery. Please be reachable on the phone number you gave us during your slot, and put your order into the freezer as soon as it arrives. Do not refreeze food that has fully thawed.</p>
      </Section>
      <Section title="If we cannot reach you">
        <p>Our rider will call you on arrival. If nobody can be reached, we will contact you to agree a new time. Because this is frozen food, we may not be able to keep an order for long, so please answer the phone during your slot.</p>
      </Section>
      <Section title="Problems with your order">
        <p>Please tell us within {h} hours of delivery if an item is missing, wrong, damaged or arrived thawed. Send your order number, and a photo if you can, through our <a href="/contact">contact page</a>.</p>
        <p>If the problem is confirmed we will replace the item or refund it. Refunds go back to the original payment method.</p>
      </Section>
      <Section title="Cancelled orders and failed payments">
        <p>An order that is not paid within 30 minutes is released, and the items return to stock. If you paid but we could not fill your order, for example because stock ran out, we will refund you in full.</p>
        <p>To cancel a paid order before it is packed, contact us as early as possible.</p>
      </Section>
      <Section title="Weight">
        <p>Our products are sold by weight or by pack, as shown on each product page. Natural variation in fresh and frozen products can make the actual weight slightly different from the stated one.</p>
      </Section>
    </LegalPage>
  );
}
