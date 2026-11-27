import { getProductReviews, getReviewSummary } from "@/lib/reviews";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);
const when = (d: Date) => new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }).format(d);

export async function ReviewsSection({ productId }: { productId: string }) {
  const [sum, list] = await Promise.all([getReviewSummary(productId), getProductReviews(productId)]);
  return (
    <section className="reviews" aria-labelledby="reviews-title">
      <h2 id="reviews-title">Customer reviews</h2>
      {sum.count === 0 ? (
        <p className="account-note">No reviews yet. Reviews come only from customers whose order was delivered.</p>
      ) : (
        <>
          <p className="reviews-summary"><span className="reviews-stars" aria-hidden="true">{stars(Math.round(sum.avg))}</span> <strong>{sum.avg.toFixed(1)}</strong> out of 5 from {sum.count} review{sum.count === 1 ? "" : "s"}</p>
          <ul className="reviews-list">
            {list.map((r) => (
              <li key={r.id}>
                <p><span className="reviews-stars" role="img" aria-label={`${r.rating} out of 5`}>{stars(r.rating)}</span> <strong>{r.displayName}</strong> <small>Verified buyer · {when(r.createdAt)}</small></p>
                {r.comment && <p>{r.comment}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
