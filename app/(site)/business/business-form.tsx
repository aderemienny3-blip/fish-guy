"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/shop/cart";
import { naira } from "@/lib/shop/format";
import { saveRegulars } from "./actions";

export type BizProduct = { id: string; slug: string; name: string; priceKobo: number; unit: string; imageUrl: string | null; category: string | null; maxQty: number };

export function BusinessForm({ products, initial, signedIn }: { products: BizProduct[]; initial: Record<string, number>; signedIn: boolean }) {
  const router = useRouter();
  const { add, remove, setOpen } = useCart();
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const [qty, setQty] = useState<Record<string, number>>(() => {
    const q: Record<string, number> = {};
    for (const [id, n] of Object.entries(initial)) { const p = byId.get(id); if (p) q[id] = Math.min(n, p.maxQty); }
    return q;
  });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const chosen = products.filter((p) => (qty[p.id] ?? 0) > 0);
  const total = chosen.reduce((n, p) => n + p.priceKobo * (qty[p.id] ?? 0), 0);
  const set = (p: BizProduct, v: string) => {
    const n = Math.max(0, Math.min(p.maxQty, Math.floor(Number(v) || 0)));
    setQty((q) => ({ ...q, [p.id]: n }));
  };
  const groups = useMemo(() => {
    const m = new Map<string, BizProduct[]>();
    for (const p of products) { const k = p.category ?? "Other"; m.set(k, [...(m.get(k) ?? []), p]); }
    return [...m.entries()];
  }, [products]);

  function toCart(go: boolean) {
    for (const p of chosen) {
      remove(p.id);
      add({ productId: p.id, slug: p.slug, name: p.name, priceKobo: p.priceKobo, unit: p.unit, imageUrl: p.imageUrl, maxQty: p.maxQty }, qty[p.id]);
    }
    if (go) router.push("/checkout"); else setOpen(true);
  }

  function save() {
    setMsg("");
    start(async () => {
      const r = await saveRegulars(chosen.map((p) => ({ productId: p.id, quantity: qty[p.id] })));
      setMsg(r.ok ? `Saved ${r.count} item${r.count === 1 ? "" : "s"} as your regular list.` : r.error);
    });
  }

  return (
    <div className="biz-form">
      {groups.map(([cat, list]) => (
        <section key={cat} aria-label={cat}>
          <h2 className="account-h2">{cat}</h2>
          <ul className="biz-list">
            {list.map((p) => (
              <li key={p.id} className={`biz-row${(qty[p.id] ?? 0) > 0 ? " is-on" : ""}`}>
                <div className="biz-name"><strong>{p.name}</strong><small>{naira(p.priceKobo)} per {p.unit}</small></div>
                <label className="biz-qty">
                  <span className="sr-only">Quantity of {p.name}</span>
                  <button type="button" aria-label={`One less ${p.name}`} onClick={() => set(p, String((qty[p.id] ?? 0) - 1))}>−</button>
                  <input inputMode="numeric" value={qty[p.id] ?? 0} onChange={(e) => set(p, e.target.value)} />
                  <button type="button" aria-label={`One more ${p.name}`} onClick={() => set(p, String((qty[p.id] ?? 0) + 1))}>+</button>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <div className="biz-bar" role="region" aria-label="Your business order">
        <div><strong>{chosen.length} item{chosen.length === 1 ? "" : "s"}</strong><span>{naira(total)} before delivery</span></div>
        <div className="biz-actions">
          <button type="button" className="button button-gold" disabled={chosen.length === 0} onClick={() => toCart(true)}>Add to cart and check out</button>
          <button type="button" className="button button-outline" disabled={chosen.length === 0} onClick={() => toCart(false)}>Add to cart</button>
          {signedIn
            ? <button type="button" className="button button-outline" disabled={pending || chosen.length === 0} onClick={save}>{pending ? "Saving…" : "Save as my regular list"}</button>
            : <Link href="/account" className="account-note">Sign in to save this as your regular list</Link>}
        </div>
        {msg && <p className="account-note" role="status">{msg}</p>}
      </div>
    </div>
  );
}
