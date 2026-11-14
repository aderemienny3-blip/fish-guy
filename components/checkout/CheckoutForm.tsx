"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/money";

type Zone = { id: string; name: string; feeKobo: number };
type Slot = { id: string; label: string };
type CartLine = { productId: string; quantity: number };

export default function CheckoutForm({
  items,
  subtotalKobo,
  zones,
  slots,
  minDate,
  maxDate,
  defaults,
}: {
  items: CartLine[];
  subtotalKobo: number;
  zones: Zone[];
  slots: Slot[];
  minDate: string; // YYYY-MM-DD, Lagos
  maxDate: string;
  defaults?: { name?: string; email?: string; phone?: string };
}) {
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fee = zones.find((z) => z.id === zoneId)?.feeKobo ?? 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        name: f.get("name"),
        email: f.get("email"),
        phone: f.get("phone"),
        addressLine: f.get("addressLine"),
        landmark: f.get("landmark") || undefined,
        notes: f.get("notes") || undefined,
        zoneId: f.get("zoneId"),
        slotId: f.get("slotId"),
        deliveryDate: f.get("deliveryDate"),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    window.location.href = json.checkoutUrl; // Monnify hosted checkout
  }

  const input =
    "w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" required placeholder="Full name" defaultValue={defaults?.name} className={input} />
        <input name="phone" required placeholder="Phone (080...)" defaultValue={defaults?.phone} className={input} />
      </div>
      <input name="email" type="email" required placeholder="Email for your receipt" defaultValue={defaults?.email} className={input} />
      <input name="addressLine" required placeholder="Delivery address" className={input} />
      <input name="landmark" placeholder="Nearest landmark (optional)" className={input} />

      <div className="grid gap-4 sm:grid-cols-2">
        <select name="zoneId" value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={input}>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name} ({formatNaira(z.feeKobo)})
            </option>
          ))}
        </select>
        <input name="deliveryDate" type="date" required min={minDate} max={maxDate} defaultValue={minDate} className={input} />
      </div>

      <select name="slotId" required className={input}>
        {slots.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      <textarea name="notes" placeholder="Notes for the rider (optional)" className={input} rows={2} />

      <div className="rounded-md border border-neutral-800 p-4 text-sm">
        <div className="flex justify-between text-neutral-400"><span>Subtotal</span><span>{formatNaira(subtotalKobo)}</span></div>
        <div className="flex justify-between text-neutral-400"><span>Delivery</span><span>{formatNaira(fee)}</span></div>
        <div className="mt-1 flex justify-between font-semibold text-neutral-100"><span>Total</span><span>{formatNaira(subtotalKobo + fee)}</span></div>
        <p className="mt-2 text-xs text-neutral-500">Final delivery fee is confirmed by the server.</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-amber-500 px-5 py-2.5 font-semibold text-neutral-950 hover:bg-amber-400 disabled:opacity-60"
      >
        {busy ? "Starting payment..." : "Pay securely"}
      </button>
    </form>
  );
}
