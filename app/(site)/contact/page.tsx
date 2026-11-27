import { LegalPage, Section } from "@/components/legal/legal-page";
import { BUSINESS, hasContact } from "@/lib/business";
import { db } from "@/lib/db";
import { getSiteFlags } from "@/lib/site-flags";
import { fmt12 } from "@/lib/admin/format";
import { formatNaira } from "@/lib/money";

export const metadata = { title: "Contact | Fish Guy" };

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const flags = await getSiteFlags();
  const zones = await db.deliveryZone.findMany({ where: { active: true, isPickup: false }, orderBy: { name: "asc" }, select: { id: true, name: true, feeKobo: true, freeOverKobo: true } }).catch(() => []);
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
        <p>Every day, {fmt12(flags.openMinute)} to {fmt12(flags.closeMinute)} (Lagos time).</p>
      </Section>
      {zones.length > 0 && (
        <Section title="Where we deliver">
          <ul className="legal-list">
            {zones.map((z) => <li key={z.id}>{z.name}: {formatNaira(z.feeKobo)}{z.freeOverKobo ? `, free over ${formatNaira(z.freeOverKobo)}` : ""}</li>)}
          </ul>
        </Section>
      )}
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
