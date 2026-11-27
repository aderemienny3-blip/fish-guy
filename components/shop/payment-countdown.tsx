"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Shown on an unpaid order: time left, a button to pay, and what to do for card, transfer or USSD. */
export function PaymentCountdown({ expiresAt, payUrl }: { expiresAt: string | null; payUrl: string | null }) {
  const router = useRouter();
  const end = expiresAt ? new Date(expiresAt).getTime() : null;
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (end === null) return;
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    // Look for the payment every few seconds, so the page flips to "paid" without a manual refresh.
    const r = setInterval(() => { if (end - Date.now() > -60_000) router.refresh(); }, 8000);
    return () => { clearInterval(t); clearInterval(r); };
  }, [end, router]);

  const mm = left === null ? "--" : String(Math.floor(left / 60000)).padStart(2, "0");
  const ss = left === null ? "--" : String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  const over = left !== null && left <= 0;

  return (
    <section className="pay-box" aria-live="polite">
      {end !== null && <p className="pay-timer">{over ? "The payment time is over. We are releasing your items." : <>Time left to pay: <strong>{mm}:{ss}</strong></>}</p>}
      {!over && payUrl && <a className="button button-gold" href={payUrl}>Pay now</a>}
      {!over && (
        <ul className="pay-steps">
          <li><strong>Card:</strong> enter your card on the Paystack page.</li>
          <li><strong>Bank transfer:</strong> Paystack shows an account number. Send the exact amount shown, from your banking app. It can take a minute or two to confirm.</li>
          <li><strong>USSD:</strong> pick your bank, dial the code Paystack shows, and approve the payment.</li>
          <li>We hold your items until the timer ends. If you already paid, keep this page open. It updates by itself.</li>
        </ul>
      )}
    </section>
  );
}
