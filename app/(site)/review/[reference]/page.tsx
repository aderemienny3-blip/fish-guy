import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { submitReviews } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rate your order | Fish Guy", robots: { index: false } };

export default async function ReviewPage({ params, searchParams }: { params: Promise<{ reference: string }>; searchParams: Promise<{ thanks?: string; error?: string }> }) {
  const { reference } = await params;
  const q = await searchParams;
  if (!/^FG-[A-F0-9]{16}$/.test(reference)) notFound();
  const order = await db.order.findUnique({ where: { reference }, include: { items: true, reviews: true } });
  if (!order) notFound();

  const done = new Map(order.reviews.map((r) => [r.productId, r]));
  const todo = [...new Map(order.items.map((i) => [i.productId, i.nameSnapshot])).entries()].filter(([id]) => !done.has(id));

  return (
    <main className="page-width utility-page review-page">
      <p className="eyebrow">ORDER {order.reference}</p>
      <h1>Rate your order</h1>
      {order.status !== "DELIVERED" ? (
        <p className="utility-intro">You can leave a review once your order has been delivered. <Link href={`/order/${order.reference}`}>Track this order</Link>.</p>
      ) : (
        <>
          {q.thanks && <p className="form-message">Thank you. Your review will show on the product page once we have checked it.</p>}
          {q.error && <p className="form-message is-error" role="alert">{q.error}</p>}
          {todo.length === 0 ? (
            <p className="utility-intro">You have reviewed everything in this order. Thank you.</p>
          ) : (
            <form action={submitReviews} className="review-form">
              <input type="hidden" name="reference" value={order.reference} />
              {todo.map(([id, name]) => (
                <fieldset key={id} className="review-item">
                  <legend>{name}</legend>
                  <div className="star-input" role="radiogroup" aria-label={`Rating for ${name}`}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <span key={n}>
                        <input type="radio" id={`r-${id}-${n}`} name={`rating-${id}`} value={n} />
                        <label htmlFor={`r-${id}-${n}`} title={`${n} star${n === 1 ? "" : "s"}`}><span className="sr-only">{n} stars</span>★</label>
                      </span>
                    ))}
                  </div>
                  <label className="review-comment">Tell others what you thought (optional)
                    <textarea name={`comment-${id}`} maxLength={500} rows={3} />
                  </label>
                </fieldset>
              ))}
              <button className="button button-gold" type="submit">Send my review</button>
              <p className="account-note">Only your first name and last initial are shown. Reviews are checked before they appear.</p>
            </form>
          )}
        </>
      )}
      <p><Link href={`/order/${order.reference}`} className="text-link">Back to my order</Link></p>
    </main>
  );
}
