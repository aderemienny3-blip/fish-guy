"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/shop/cart";
import { deliveryFeeFor } from "@/lib/delivery";
import { naira } from "@/lib/shop/format";

type Zone = { id: string; name: string; feeKobo: number; freeOverKobo: number | null };
export const ZONE_KEY = "fish-guy-zone-v1";

/** Delivery fee and free-delivery progress inside the cart, so nobody finds the fee out only at the last step. */
export function DeliveryEstimate() {
  const { subtotalKobo } = useCart();
  const [zones, setZones] = useState<Zone[] | null>(null);
  const [zoneId, setZoneId] = useState("");

  useEffect(() => {
    let off = false;
    fetch("/api/shop/zones").then((r) => r.json()).then((j: { zones?: Zone[] }) => {
      if (off) return;
      const list = j.zones ?? [];
      setZones(list);
      try { const s = window.localStorage.getItem(ZONE_KEY); if (s && list.some((z) => z.id === s)) setZoneId(s); } catch { /* ignore */ }
    }).catch(() => { if (!off) setZones([]); });
    return () => { off = true; };
  }, []);

  if (!zones || zones.length === 0) return null;
  const zone = zones.find((z) => z.id === zoneId);
  const fee = zone ? deliveryFeeFor(zone, subtotalKobo) : null;
  const left = zone?.freeOverKobo ? zone.freeOverKobo - subtotalKobo : 0;
  const pct = zone?.freeOverKobo ? Math.min(100, Math.round((subtotalKobo / zone.freeOverKobo) * 100)) : 0;

  return (
    <div className="delivery-estimate">
      <label>Delivery area
        <select value={zoneId} onChange={(e) => { setZoneId(e.target.value); try { window.localStorage.setItem(ZONE_KEY, e.target.value); } catch { /* ignore */ } }}>
          <option value="">Choose your area</option>
          {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </label>
      {!zone && <p>Pick your area to see the delivery fee. Fees start from {naira(Math.min(...zones.map((z) => z.feeKobo)))}.</p>}
      {zone && fee !== null && <p>Delivery to {zone.name}: <strong>{fee === 0 ? "Free" : naira(fee)}</strong></p>}
      {zone?.freeOverKobo ? (
        left > 0
          ? <><p>Add <strong>{naira(left)}</strong> more for free delivery.</p><div className="free-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><span style={{ width: pct + "%" }} /></div></>
          : <p>You have free delivery to {zone.name}.</p>
      ) : null}
    </div>
  );
}
