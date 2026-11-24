/** The gold check shown beside a verified artist's name. */
export function VerifiedBadge({ className = "" }: { className?: string }) {
  return (
    <svg className={`verified-badge ${className}`} viewBox="0 0 24 24" role="img" aria-label="Verified artist">
      <title>Verified artist</title>
      <path fill="#D4AF37" d="M12 1l2.4 2.1 3.2-.3 1.2 3 2.9 1.5-.7 3.1 1.6 2.8-2.3 2.2-.3 3.2-3.1.8L12 23l-2.6-2.5-3.1-.8-.3-3.2L3.7 14.3l1.6-2.8-.7-3.1 2.9-1.5 1.2-3 3.2.3z" />
      <path d="M8 12.5l2.7 2.7L16.3 9.6" stroke="#0A0A0A" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
