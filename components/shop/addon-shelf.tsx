"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Plus } from "lucide-react";
import { naira } from "@/lib/shop/format";
import { useCart } from "@/components/shop/cart";
import type { AddOnItem } from "@/lib/shop/addons";

const MAX_PER_ORDER = 50;

function AddOnChip({ item, openCart }: { item: AddOnItem; openCart: boolean }) {
  const { add, setOpen, lines } = useCart();
  const maxQty = Math.min(item.stockQty, MAX_PER_ORDER);
  const inCart = lines.find((l) => l.productId === item.id)?.qty ?? 0;
  const full = inCart >= maxQty;

  return (
    <li className="addon-chip">
      <span className="addon-thumb">
        {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="56px" unoptimized /> : <b aria-hidden="true">{item.name.slice(0, 1)}</b>}
      </span>
      <span className="addon-text">
        <strong>{item.name}</strong>
        <small>{naira(item.priceKobo)} / {item.unit}</small>
      </span>
      <button
        type="button"
        className={`addon-add ${inCart > 0 ? "is-in" : ""}`}
        disabled={full}
        aria-label={inCart > 0 ? `Add another ${item.name}, ${inCart} in cart` : `Add ${item.name} to your order`}
        onClick={() => {
          add({ productId: item.id, slug: item.slug, name: item.name, priceKobo: item.priceKobo, unit: item.unit, imageUrl: item.imageUrl, maxQty }, 1);
          if (openCart) setOpen(true);
        }}
      >
        {inCart > 0 ? <><Check aria-hidden="true" /> {inCart}</> : <Plus aria-hidden="true" />}
      </button>
    </li>
  );
}

/** Row of add-on products with a one-tap add button. Used on product pages. */
export function AddOnShelf({ items, title, note }: { items: AddOnItem[]; title: string; note?: string }) {
  if (items.length === 0) return null;
  return (
    <section className="addon-shelf" aria-label={title}>
      <h2>{title}</h2>
      {note && <p>{note}</p>}
      <ul>{items.map((i) => <AddOnChip key={i.id} item={i} openCart />)}</ul>
    </section>
  );
}

/** Same thing inside the cart drawer: loads live add-ons and hides ones already in the cart. */
export function CartAddOns() {
  const { isOpen, lines } = useCart();
  const [items, setItems] = useState<AddOnItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    fetch("/api/shop/add-ons", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => { if (alive && Array.isArray(d.items)) setItems(d.items); })
      .catch(() => {});
    return () => { alive = false; };
  }, [isOpen]);

  const inCart = new Set(lines.map((l) => l.productId));
  const show = items.filter((i) => !inCart.has(i.id));
  if (show.length === 0) return null;

  return (
    <section className="addon-drawer" aria-label="Add to your order">
      <h3>Add to your order</h3>
      <ul>{show.map((i) => <AddOnChip key={i.id} item={i} openCart={false} />)}</ul>
    </section>
  );
}
