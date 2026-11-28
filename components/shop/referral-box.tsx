"use client";

import { useEffect, useState } from "react";
import { naira } from "@/lib/shop/format";

type Me = { enabled: boolean; discountKobo: number; minOrderKobo: number; signedIn: boolean; balanceKobo: number };

/** Referral code and credit, inside the checkout form. The server works out the real amounts when the order is placed. */
export function ReferralBox() {
  const [me, setMe] = useState<Me | null>(null);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discountKobo: number } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/referral/me", { cache: "no-store" }).then((r) => r.json()).then((d: Me) => live && setMe(d)).catch(() => {});
    try {
      const m = /(?:^|; )fg_ref=([^;]+)/.exec(document.cookie);
      if (m) setCode(decodeURIComponent(m[1]));
    } catch { /* ignore */ }
    return () => { live = false; };
  }, []);

  async function apply() {
    setMsg("");
    if (!code.trim()) return;
    setBusy(true);
    try {
      const d = await fetch(`/api/referral/check?code=${encodeURIComponent(code.trim())}`, { cache: "no-store" }).then((r) => r.json());
      if (d.valid) { setApplied({ code: d.code, discountKobo: d.discountKobo }); setCode(d.code); }
      else { setApplied(null); setMsg(d.reason ?? "That code can't be used."); }
    } catch { setMsg("Could not check the code. Try again."); }
    finally { setBusy(false); }
  }

  if (!me) return null;
  const showCode = me.enabled;
  const showCredit = me.signedIn && me.balanceKobo > 0;
  if (!showCode && !showCredit) return null;

  return (
    <fieldset className="referral-box" style={{ border: "1px solid rgba(212,175,55,.35)", borderRadius: 12, padding: "0.9rem 1rem", margin: "0.5rem 0" }}>
      <legend style={{ padding: "0 .4rem" }}>Referral and credit</legend>
      {showCode && (
        <div>
          <label htmlFor="ref-code" style={{ display: "block", marginBottom: ".25rem" }}>Have a friend&apos;s referral code? (first orders only)</label>
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <input id="ref-code" value={code} onChange={(e) => { setCode(e.target.value); setApplied(null); }} placeholder="FISH-XXXXX" autoCapitalize="characters" maxLength={14} />
            <button type="button" className="button button-outline" onClick={apply} disabled={busy}>{busy ? "Checking…" : "Apply"}</button>
          </div>
          <input type="hidden" name="referralCode" value={applied?.code ?? ""} />
          {applied && <p className="field-note">Code accepted. You get {naira(applied.discountKobo)} off your food when you pay{me.minOrderKobo > 0 ? ` (food total of at least ${naira(me.minOrderKobo)})` : ""}. The payment page shows your final total.</p>}
          {msg && <p className="field-note" role="alert" style={{ color: "#ffb4a8" }}>{msg}</p>}
        </div>
      )}
      {showCredit && (
        <label className="consent-row" style={{ marginTop: ".6rem" }}>
          <input type="checkbox" name="useCredit" defaultChecked />
          <span>Use my credit ({naira(me.balanceKobo)} available). You always pay at least ₦200 by card.</span>
        </label>
      )}
    </fieldset>
  );
}
