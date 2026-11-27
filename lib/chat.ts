import { BUSINESS } from "@/lib/business";

/** The shop's WhatsApp number: lib/business.ts first, then the NEXT_PUBLIC_WHATSAPP variable. Digits only. */
export const chatNumber = () => (BUSINESS.whatsapp || process.env.NEXT_PUBLIC_WHATSAPP || "").replace(/\D/g, "");

export function chatLink(text: string): string | null {
  const n = chatNumber();
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
