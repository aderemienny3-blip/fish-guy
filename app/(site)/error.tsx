"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="page-width utility-page">
      <section className="error-state" role="alert">
        <p className="eyebrow">SOMETHING WENT WRONG</p>
        <h1>We couldn&apos;t load this page.</h1>
        <p>Please try again. If the problem continues, check back in a few minutes.</p>
        <button className="button button-gold" type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
