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
          <li>Music: if you buy or download a track, the purchase and download records. Play counts are recorded for artists without being linked to your name.</li>
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
        <p>Our team, our delivery riders (name, phone and address only for your delivery), and service providers who help us run the shop: Paystack for payments, Vercel for hosting, and an email service for order messages. They may only use your data to provide those services.</p>
      </Section>
      <Section title="How long we keep it">
        <p>Order records are kept for as long as needed for accounting, refunds and the law. You can ask us to delete other information we hold about you.</p>
      </Section>
      <Section title="Your rights">
        <p>You can ask to see, correct or delete your information, and object to how we use it. {BUSINESS.email ? <>Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.</> : <>Use our <a href="/contact">contact page</a>.</>} You may also complain to the Nigeria Data Protection Commission.</p>
      </Section>
    </LegalPage>
  );
}
