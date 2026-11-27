"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "@/lib/consent";

/** Asks once whether Meta may measure which ads bring orders. Only shows when a pixel is set up. */
export function ConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => { if (process.env.NEXT_PUBLIC_META_PIXEL_ID && getConsent() === null) setShow(true); }, []);
  if (!show) return null;
  const pick = (v: "yes" | "no") => { setConsent(v); setShow(false); };
  return (
    <div className="consent-banner" role="dialog" aria-label="Ad measurement choice">
      <p>Can we use Meta (Facebook and Instagram) tools to see which ads bring orders? Details are in our <Link href="/privacy">privacy policy</Link>. Shopping works the same either way.</p>
      <div>
        <button type="button" className="button button-gold" onClick={() => pick("yes")}>Allow</button>
        <button type="button" className="button button-outline" onClick={() => pick("no")}>No thanks</button>
      </div>
    </div>
  );
}
