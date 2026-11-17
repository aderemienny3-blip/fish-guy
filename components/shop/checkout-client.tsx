"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { addDays, deliveryFeeFor, isSlotBookable } from "@/lib/delivery";
import { naira } from "@/lib/shop/format";
import { useCart } from "@/components/shop/cart";
import { discountFor } from "@/lib/student-math";

const STUDENT_KEY = "fish-guy-student-v1";

type Zone = { id: string; name: string; feeKobo: number; freeOverKobo: number | null };
type Slot = { id: string; label: string; startMinute: number };
type Live = { id: string; slug: string; name: string; priceKobo: number; unit: string; stockQty: number; imageUrl: string | null };

const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-NG", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).format(new Date(iso + "T00:00:00Z"));

export function CheckoutClient({ zones, slots, today, lastDay, student }: { zones: Zone[]; slots: Slot[]; today: string; lastDay: string; student: { percent: number; maxKobo: number | null } }) {
  const { lines, ready, remove, setQty } = useCart();
  const [live, setLive] = useState<Map<string, Live> | null>(null);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [slotId, setSlotId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [studentRef, setStudentRef] = useState<string | null>(null);

  // A saved student code is only used if the server confirms it is still active.
  useEffect(() => {
    if (student.percent <= 0) return;
    let ref: string | null = null;
    try { ref = window.localStorage.getItem(STUDENT_KEY); } catch { /* ignore */ }
    if (!ref) return;
    fetch(`/api/student/check?ref=${encodeURIComponent(ref)}`)
      .then((r) => r.json())
      .then((j: { valid?: boolean }) => { if (j.valid) setStudentRef(ref); else { try { window.localStorage.removeItem(STUDENT_KEY); } catch { /* ignore */ } } })
      .catch(() => undefined);
  }, [student.percent]);

  // Re-check current prices and stock, because the cart is stored in the browser.
  const idsKey = lines.map((l) => l.productId).sort().join(",");
  useEffect(() => {
    if (!ready || !idsKey) return;
    let cancelled = false;
    fetch("/api/shop/cart-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: idsKey.split(",") }) })
      .then((r) => r.json())
      .then((j: { products?: Live[] }) => { if (!cancelled) setLive(new Map((j.products ?? []).map((p) => [p.id, p]))); })
      .catch(() => { if (!cancelled) setError("We could not check current prices. Please refresh the page."); });
    return () => { cancelled = true; };
  }, [ready, idsKey]);

  const { items, unavailable, subtotalKobo } = useMemo(() => {
    const items: { productId: string; name: string; unit: string; priceKobo: number; quantity: number }[] = [];
    const unavailable: { productId: string; name: string }[] = [];
    if (live) {
      for (const l of lines) {
        const p = live.get(l.productId);
        if (!p || p.stockQty <= 0) { unavailable.push({ productId: l.productId, name: l.name }); continue; }
        items.push({ productId: p.id, name: p.name, unit: p.unit, priceKobo: p.priceKobo, quantity: Math.min(l.qty, p.stockQty, 50) });
      }
    }
    return { items, unavailable, subtotalKobo: items.reduce((n, i) => n + i.priceKobo * i.quantity, 0) };
  }, [lines, live]);

  const days = useMemo(() => {
    const out: string[] = [];
    for (let d = today; d <= lastDay; d = addDays(d, 1)) {
      if (slots.some((s) => isSlotBookable(d, s.startMinute))) out.push(d);
    }
    return out;
  }, [today, lastDay, slots]);

  const effectiveDate = date && days.includes(date) ? date : days[0] ?? "";
  const openSlots = slots.filter((s) => effectiveDate && isSlotBookable(effectiveDate, s.startMinute));
  const effectiveSlot = openSlots.some((s) => s.id === slotId) ? slotId : openSlots[0]?.id ?? "";

  const zone = zones.find((z) => z.id === zoneId) ?? zones[0];
  const fee = zone ? deliveryFeeFor(zone, subtotalKobo) : 0;
  const discount = studentRef ? discountFor(subtotalKobo, student.percent, student.maxKobo) : 0;
  const total = subtotalKobo - discount + fee;

  if (!ready) return <p className="utility-intro" role="status">Loading your cart…</p>;

  if (lines.length === 0) {
    return (
      <div className="shop-empty-state" role="status">
        <div><h3>Your cart is empty</h3><p>Add something from the shop to check out.</p></div>
        <Link href="/shop" className="button button-outline">Browse the shop</Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!items.length || !effectiveSlot || !effectiveDate) { setError("Choose a delivery day and time slot."); return; }
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          addressLine: f.get("addressLine"),
          landmark: f.get("landmark") || undefined,
          notes: f.get("notes") || undefined,
          zoneId,
          slotId: effectiveSlot,
          deliveryDate: effectiveDate,
          studentRef: studentRef ?? undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || typeof json.checkoutUrl !== "string") throw new Error(json.error ?? "Could not start payment. Please try again.");
      window.location.assign(json.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="checkout-layout">
      <form className="checkout-shell" onSubmit={onSubmit}>
        <fieldset>
          <legend>Contact</legend>
          <label>Full name<input name="name" autoComplete="name" required minLength={2} /></label>
          <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="080..." required /></label>
          <label className="span-2">Email for your receipt<input name="email" type="email" autoComplete="email" required /></label>
        </fieldset>
        <fieldset>
          <legend>Delivery</legend>
          <label className="span-2">Delivery address<input name="addressLine" autoComplete="street-address" required minLength={5} /></label>
          <label>Nearest landmark (optional)<input name="landmark" /></label>
          <label>
            Area (local government)
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </label>
          <label>
            Delivery day
            <select value={effectiveDate} onChange={(e) => setDate(e.target.value)} disabled={days.length === 0}>
              {days.map((d) => <option key={d} value={d}>{d === today ? "Today" : dayLabel(d)}</option>)}
            </select>
          </label>
          <label>
            Time slot
            <select value={effectiveSlot} onChange={(e) => setSlotId(e.target.value)} disabled={openSlots.length === 0}>
              {openSlots.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          <label className="span-2">Note for the rider (optional)<input name="notes" maxLength={300} /></label>
          <p className="field-note span-2">We deliver across Lagos, except Ikorodu. Slots need at least 2 hours to pack your order.</p>
        </fieldset>
        {days.length === 0 && <p className="form-message is-error" role="alert">No delivery slots are open right now. Please check back soon.</p>}
        {error && <p className="form-message is-error" role="alert">{error}</p>}
        <button className="button button-gold" type="submit" disabled={busy || items.length === 0 || days.length === 0}>
          {busy ? "Starting payment…" : `Pay ${naira(total)} securely`}
        </button>
        {studentRef && <p className="field-note">Student discount applies only if the phone number above is the one you verified with.</p>}
        <p className="field-note">You will be taken to Monnify to pay by card, bank transfer or USSD.</p>
      </form>

      <aside className="order-summary" aria-label="Order summary">
        <h2>Your order</h2>
        {live === null ? <p className="field-note">Checking prices…</p> : (
          <>
            {unavailable.length > 0 && (
              <div className="summary-notice" role="alert">
                <p>Not available right now: {unavailable.map((u) => u.name).join(", ")}.</p>
                <button type="button" onClick={() => unavailable.forEach((u) => remove(u.productId))}>Remove from cart</button>
              </div>
            )}
            <ul className="summary-lines">
              {items.map((i) => (
                <li key={i.productId}>
                  <span>{i.name} <small>× {i.quantity} {i.unit}</small></span>
                  <strong>{naira(i.priceKobo * i.quantity)}</strong>
                </li>
              ))}
            </ul>
            {items.some((i) => i.quantity !== (lines.find((l) => l.productId === i.productId)?.qty ?? i.quantity)) && (
              <div className="summary-notice">
                <p>Some quantities were reduced to what we have in stock.</p>
                <button type="button" onClick={() => items.forEach((i) => setQty(i.productId, i.quantity))}>Update cart</button>
              </div>
            )}
          </>
        )}
        <dl className="summary-totals">
          <div><dt>Subtotal</dt><dd>{naira(subtotalKobo)}</dd></div>
          {discount > 0 && <div className="summary-discount"><dt>Student discount ({student.percent}%)</dt><dd>-{naira(discount)}</dd></div>}
          <div><dt>Delivery{zone ? ` (${zone.name})` : ""}</dt><dd>{fee === 0 && subtotalKobo > 0 ? "Free" : naira(fee)}</dd></div>
          <div className="summary-grand"><dt>Total</dt><dd>{naira(total)}</dd></div>
        </dl>
        {student.percent > 0 && (studentRef
          ? <button type="button" className="student-remove" onClick={() => setStudentRef(null)}>Remove student discount</button>
          : <p className="field-note"><Link href="/student">Student in Lagos? Save {student.percent}%</Link></p>)}
        <p className="field-note">The final price is confirmed again by our server when you pay.</p>
      </aside>
    </div>
  );
}
