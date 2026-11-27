import { LegalPage, Section } from "@/components/legal/legal-page";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Artist terms | Fish Guy Sounds" };

// Plain-language starting terms. Have a Nigerian entertainment lawyer review them before you rely on them.
export default function ArtistTerms() {
  return (
    <LegalPage eyebrow="FISH GUY SOUNDS" title="Artist terms" intro={`These terms apply to artists who submit music to ${BUSINESS.name} Sounds. Last updated 24 November 2026.`}>
      <Section title="You keep your music">
        <p>You own your music. Nothing here transfers your copyright to us.</p>
      </Section>
      <Section title="What you allow us to do">
        <p>You give {BUSINESS.legalName || BUSINESS.name} a non-exclusive licence to host, stream, preview, promote and sell the tracks you submit on the Fish Guy Sounds website and apps, for as long as the track is live. You can ask us to take a track down at any time. We will remove it from sale promptly, but copies already bought by fans stay with them.</p>
      </Section>
      <Section title="Your promises">
        <p>By submitting music you confirm that you wrote and own it, or have the right to license it to us, and that no one else needs to give permission. Any samples, beats, features or other people&apos;s work in it are cleared and credited. The music does not break anyone&apos;s copyright or other rights. You will tell us right away if that stops being true.</p>
      </Section>
      <Section title="Complaints and take-downs">
        <p>If someone says a track breaks their rights, we may take it offline straight away while we look into it. We may remove a track, or an artist, that breaks these terms. You agree to cover reasonable losses we suffer because a track you submitted was not yours to license.</p>
      </Section>
      <Section title="Money">
        <p>Your share of each sale is set by Fish Guy and shown in your artist dashboard. If a track has collaborators, their percentages come out of the artist share and are recorded on a split sheet, which everyone on it agrees to. A split applies to sales made after it is saved. You can ask for a payout from your dashboard once you reach the minimum amount, and we pay it by bank transfer to the account you save there. Sales figures in your dashboard are before your share is taken out.</p>
      </Section>
      <Section title="Labels and managers">
        <p>A label can manage your artist profile only with your consent. When a label adds you, it confirms that you have agreed to be managed by it and to let its team see your plays, sales, fans and earnings. Labels cannot upload music without our checks, and only you can save bank details and ask for payouts. If you did not agree to be on a label, or want to leave one, email us and we will remove the link.</p>
      </Section>
      <Section title="Fan details">
        <p>Your dashboard may show fans&apos; first names, locations and, where the fan allowed it, email addresses. Use them only to thank fans and tell them about your music. Never sell them, share them or add people to lists they did not join.</p>
      </Section>
      <Section title="Governing law">
        <p>These terms are governed by the laws of the Federal Republic of Nigeria. Questions? Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.</p>
      </Section>
    </LegalPage>
  );
}
