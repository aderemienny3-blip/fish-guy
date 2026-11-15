"use client";

export default function PrintButton({ children = "Print" }: { children?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center justify-center rounded-md border border-white/15 px-3 py-1.5 text-sm text-[#F5F1E6] transition hover:border-[#D4AF37] hover:text-[#D4AF37] print:hidden"
    >
      {children}
    </button>
  );
}
