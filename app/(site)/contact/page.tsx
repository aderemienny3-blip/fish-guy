import { LegalPage, Section } from "@/components/legal/legal-page";
import { BUSINESS, hasContact } from "@/lib/business";

export const metadata = { title: "Contact | Fish Guy" };

export default function ContactPage() {
  const wa = BUSINESS.whatsapp.replace(/\D/g, "");
  return (
    <LegalPage eyebrow="CONTACT" title="Talk to Fish Guy" intro="Questions about an order, a delivery or a product? Reach us here. Have your order number ready if you have one.">
      <Section title="Reach us">
        {hasContact() ? (
          <ul className="legal-list">
            {wa && <li>WhatsApp: <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">chat with us</a></li>}
            {BUSINESS.phone && <li>Phone: <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}>{BUSINESS.phone}</a></li>}
            {BUSINESS.email && <li>Email: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></li>}
            {BUSINESS.instagram && <li>Instagram: <a href={`https://instagram.com/${BUSINESS.instagram}`} target="_blank" rel="noreferrer">@{BUSINESS.instagram}</a></li>}
          </ul>
        ) : (
          <p>Our contact details are being added. For now, use the order page for anything about an order you have placed.</p>
        )}
      </Section>
      <Section title="Opening hours">
        <p>Every day, 8:30 AM to 9:00 PM (Lagos time).</p>
      </Section>
      {(BUSINESS.legalName || BUSINESS.address || BUSINESS.cacNumber) && (
        <Section title="Who we are">
          <p>
            {BUSINESS.legalName || BUSINESS.name}
            {BUSINESS.cacNumber ? ` · ${BUSINESS.cacNumber}` : ""}
            {BUSINESS.address ? ` · ${BUSINESS.address}` : ""}
          </p>
        </Section>
      )}
    </LegalPage>
  );
}
