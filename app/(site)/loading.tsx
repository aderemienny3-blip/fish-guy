export default function Loading() {
  return (
    <main className="page-width loading-page" aria-busy="true" aria-live="polite">
      <span className="visually-hidden">Loading Fish Guy</span>
      <div className="loading-hero" aria-hidden="true"><span /><span /></div>
    </main>
  );
}
