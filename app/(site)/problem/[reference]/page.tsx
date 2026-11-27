import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BUSINESS } from "@/lib/business";
import { COMPLAINT_KINDS } from "@/lib/complaints";
import { WhatsAppLink } from "@/components/shop/whatsapp-chat";
import { reportProblem } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report a problem | Fish Guy", robots: { index: false } };

export default async function ProblemPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ thanks?: string; error?: string }> }) {
  const { reference } = await params;
  const q = await searchParams;
  if (!/^FG-[A-F0-9]{16}$/.test(reference)) notFound();
  const order = await db.order.findUnique({ where: { reference }, select: { reference: true, status: true, deliveredAt: true } });
  if (!order) notFound();
  const late = order.deliveredAt ? Date.now() - order.deliveredAt.getTime() > BUSINESS.reportWindowHours * 3_600_000 : false;

  return (
    <main className="page-width utility-page review-page">
      <p className="eyebrow">ORDER {order.reference}</p>
      <h1>Report a problem</h1>
      {order.status !== "DELIVERED" ? (
        <p className="utility-intro">You can report a problem once your order has been delivered. <Link href={`/order/${order.reference}`}>Track this order</Link>.</p>
      ) : (
        <>
          {q.thanks && <p className="form-message">Thank you. We have your report and we will contact you soon.</p>}
          {q.error && <p className="form-message is-error" role="alert">{q.error}</p>}
          {late && <p className="utility-intro">Our policy is to report problems within {BUSINESS.reportWindowHours} hours of delivery. You can still tell us and we will look at it.</p>}
          <form action={reportProblem} className="review-form">
            <input type="hidden" name="reference" value={order.reference} />
            <fieldset className="review-item">
              <legend>What went wrong?</legend>
              {Object.entries(COMPLAINT_KINDS).map(([k, label]) => (
                <label key={k} style={{ display: "block", margin: "0.35rem 0" }}><input type="radio" name="kind" value={k} /> {label}</label>
              ))}
              <label className="review-comment">Tell us what happened
                <textarea name="message" maxLength={1000} rows={4} required />
              </label>
            </fieldset>
            <button className="button button-gold" type="submit">Send report</button>
            <p className="account-note">Have a photo? Send it to us on WhatsApp with your order number: <WhatsAppLink text={`Hello Fish Guy, photo for order ${order.reference}`} label="open WhatsApp" className="text-link" />.</p>
          </form>
        </>
      )}
      <p><Link href={`/order/${order.reference}`} className="text-link">Back to my order</Link></p>
    </main>
  );
}
