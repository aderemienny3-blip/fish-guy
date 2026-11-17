import type { ReactNode } from "react";
import { BUSINESS } from "@/lib/business";

export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <main className="page-width utility-page legal-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {intro && <p className="utility-intro">{intro}</p>}
      <div className="legal-body">{children}</div>
      <p className="field-note legal-updated">Last updated {BUSINESS.lastUpdated}</p>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
