"use client";

import { useState } from "react";

export function AdPayButton({ reference, label }: { reference: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/ads/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || typeof json.checkoutUrl !== "string") throw new Error(json.error ?? "Could not start payment.");
      window.location.assign(json.checkoutUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start payment.");
      setBusy(false);
    }
  }
  return (
    <div>
      <button className="button button-gold" onClick={pay} disabled={busy}>{busy ? "Starting payment…" : label}</button>
      {error && <p className="form-message is-error" role="alert">{error}</p>}
    </div>
  );
}
