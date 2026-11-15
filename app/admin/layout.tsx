import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fish Guy Admin",
  robots: { index: false, follow: false },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0A0A0A] text-[#F5F1E6] print:bg-white print:text-black">{children}</div>;
}
