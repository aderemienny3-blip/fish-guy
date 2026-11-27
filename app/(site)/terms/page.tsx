import { LegalPage, Section } from "@/components/legal/legal-page";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Terms | Fish Guy" };

export default function Terms() {
  return (
    <LegalPage eyebrow="TERMS" title="Terms of use" intro={`These terms apply when you use the ${BUSINESS.name} website to buy frozen food or music.`}>
      <Section title="Who we are">
        <p>{BUSINESS.legalName || BUSINESS.name} sells frozen food for delivery in Lagos, Nigeria, and hosts independent music from artists.{BUSINESS.cacNumber ? ` Registration: ${BUSINESS.cacNumber}.` : ""}</p>
      </Section>
      <Section title="Orders and prices">
        <p>All prices are in Nigerian naira. The price and stock are confirmed by our server when you pay. If an item sells out while you are checking out, we will tell you before you pay. An order is accepted once your payment is confirmed.</p>
      </Section>
      <Section title="Payment">
        <p>Payments are processed securely by Paystack, by card, bank transfer or USSD. Unpaid orders are released after 30 minutes.</p>
      </Section>
      <Section title="Delivery and refunds">
        <p>Delivery areas, times, the cold-chain rules and our refund process are in our <a href="/delivery-refunds">delivery and refunds policy</a>, which forms part of these terms.</p>
      </Section>
      <Section title="Student discount">
        <p>The student discount is for people currently studying at a university, polytechnic or college of education in Lagos. It needs a successful verification, works only with the phone number you applied with, applies to food (not delivery fees), and lasts for the period shown on your status page. We may refuse or withdraw it if the information given is false.</p>
      </Section>
      <Section title="Music">
        <p>Tracks are provided by independent artists, who confirm that they own the rights to what they upload. Buying a track gives you a personal licence to listen and download it for your own use. You may not copy, resell or share it publicly. We may remove a track after a rights complaint.</p>
      </Section>
      <Section title="Messages">
        <p>When you order, you agree that we send you messages about that order by WhatsApp and email. Offers and reorder reminders are sent only if you agree to them at checkout, and you can stop them at any time.</p>
      </Section>
      <Section title="Using the site">
        <p>Do not misuse the site, try to break into it, or place orders with false details. We may cancel and refund orders that look fraudulent.</p>
      </Section>
      <Section title="Our responsibility">
        <p>We take care to deliver safe food, but we are not liable for losses that were not reasonably foreseeable. Nothing here limits your rights under Nigerian consumer law.</p>
      </Section>
      <Section title="Changes">
        <p>We may update these terms. The date at the bottom shows when they last changed. Questions? See our <a href="/contact">contact page</a>.</p>
      </Section>
    </LegalPage>
  );
}
