import { LegalPage, Section } from "@/components/legal/legal-page";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Privacy | Fish Guy" };

export default function Privacy() {
  return (
    <LegalPage eyebrow="PRIVACY" title="How we handle your information" intro="What we collect, why, and the choices you have. We follow the Nigeria Data Protection Act.">
      <Section title="What we collect">
        <ul className="legal-list">
          <li>Orders: your name, phone number, email, delivery address, landmark and any note you add, and what you ordered.</li>
          <li>Payments: handled by Paystack. We receive confirmation and the payment method type. We never see or store your card details.</li>
          <li>Student discount: your name, phone, email, school, matric number and a photo of your student ID.</li>
          <li>Music: if you buy or download a track, the purchase and download records. Play counts are recorded for artists without being linked to your name, together with your approximate location (state or city, worked out from your internet connection). Artists see each buyer's first name and approximate location. Your email is shared with the artist only if you tick the box at checkout.</li>
          <li>Basic technical data such as your browser type, used to keep the site working and secure.</li>
        </ul>
      </Section>
      <Section title="Why we use it">
        <p>To take and deliver your order, confirm payment, contact you about it, prevent fraud, give you the student discount, and meet our legal duties. We email or message you about your orders. We do not sell your personal information.</p>
      </Section>
      <Section title="Student ID photos">
        <p>Your ID photo is used only to check that you are a student. It is deleted when we approve or reject your application. We keep the details on the application, such as your name, school and matric number, so we can honour the discount.</p>
      </Section>
      <Section title="Who sees your information">
        <p>Our team, our delivery riders (name, phone and address only for your delivery), and service providers who help us run the shop: Paystack for payments, Vercel for hosting, an email service for order messages, and Meta for WhatsApp messages and, if you allow it, ad measurement. They may only use your data to provide those services.</p>
      </Section>
      <Section title="How long we keep it">
        <p>Order records are kept for as long as needed for accounting, refunds and the law. You can ask us to delete other information we hold about you.</p>
      </Section>
      <Section title="Ads and tracking">
        <p>If you tap Allow on our ad-measurement banner, we use the Meta Pixel and Meta&apos;s Conversions API. Meta receives which pages you viewed, what you added to your cart, when you started checkout and what you bought, with its value. For purchases it also receives your email and phone number in scrambled (hashed) form, your browser details and your approximate internet address, so ads can be measured and matched. If you do not tap Allow, none of the Meta tools load and none of this is sent.</p>
        <p>Separately, we keep a small cookie for 30 days that remembers which link, ad or site sent you here, and an anonymous visit number that lets us count how many visitors add to cart and check out. They do not contain your name, phone or email. Clearing this site&apos;s cookies and storage in your browser removes them and the banner will ask you again.</p>
      </Section>
      <Section title="Messages and reminders">
        <p>We send messages about your order by WhatsApp and email: payment received, being packed, out for delivery, delivered, and a reminder if payment is still waiting. These are part of your order. We send offers and reorder reminders only if you tick the box at checkout. You can stop them at any time by replying STOP on WhatsApp or using the stop link in our emails. Stopping offers does not stop order messages.</p>
        <p>We keep a record of the messages we send (who, when, what kind and whether it was delivered) to help with support and to show what was sent. The text of the message is not kept in that record.</p>
      </Section>
      <Section title="Your rights">
        <p>You can ask to see, correct or delete your information, and object to how we use it. {BUSINESS.email ? <>Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.</> : <>Use our <a href="/contact">contact page</a>.</>} You may also complain to the Nigeria Data Protection Commission.</p>
      </Section>
    </LegalPage>
  );
}
