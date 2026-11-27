import Link from "next/link";
import { requestBulkQuote } from "./actions";

export const metadata = {
  title: "Bulk frozen food for restaurants and events in Lagos | Fish Guy",
  description: "Ask Fish Guy for a price on frozen fish, turkey and chicken for your restaurant, catering or event in Lagos.",
  alternates: { canonical: "/bulk" },
};

export default async function BulkPage({ searchParams }: { searchParams: Promise<{ thanks?: string; error?: string }> }) {
  const q = await searchParams;
  return (
    <main className="page-width utility-page review-page">
      <p className="eyebrow">RESTAURANTS · CATERERS · EVENTS</p>
      <h1>Ask for a bulk price</h1>
      <p className="utility-intro">Tell us what you need and roughly how much. We will contact you with a price. There is no obligation.</p>
      {q.thanks && <p className="form-message">Thank you. We have your request and we will contact you soon.</p>}
      {q.error && <p className="form-message is-error" role="alert">{q.error}</p>}
      <form action={requestBulkQuote} className="review-form">
        <label className="review-comment">Your name<input name="name" required maxLength={80} autoComplete="name" /></label>
        <label className="review-comment">Phone or WhatsApp number<input name="phone" required inputMode="tel" maxLength={20} autoComplete="tel" /></label>
        <label className="review-comment">Business or event (optional)<input name="business" maxLength={80} /></label>
        <label className="review-comment">What do you need, and how much?<textarea name="items" required rows={4} maxLength={1000} placeholder="For example: the products you want and the quantity per week or for the day" /></label>
        <label className="review-comment">Delivery area (optional)<input name="area" maxLength={80} /></label>
        <label className="review-comment">Needed by (optional)<input name="neededBy" maxLength={60} placeholder="A date, or weekly" /></label>
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }} />
        <button className="button button-gold" type="submit">Send request</button>
        <p className="account-note">Regular business buyers can also save a list of regular items on the <Link href="/business">business order page</Link>.</p>
      </form>
    </main>
  );
}
