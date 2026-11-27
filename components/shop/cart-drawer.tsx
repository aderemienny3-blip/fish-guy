"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { naira } from "@/lib/shop/format";
import { useCart } from "@/components/shop/cart";
import { PromoProgress } from "@/components/shop/promo-progress";
import { CartAddOns } from "@/components/shop/addon-shelf";
import { WhatsAppLink } from "@/components/shop/whatsapp-chat";
import { DeliveryEstimate } from "@/components/shop/delivery-estimate";

export function CartDrawer() {
  const { lines, count, subtotalKobo, isOpen, setOpen, setQty, remove } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (isOpen && !d.open) d.showModal();
    if (!isOpen && d.open) d.close();
  }, [isOpen]);

  return (
    <>
      <button className="cart-trigger" type="button" aria-label={`Open cart, ${count} items`} aria-haspopup="dialog" aria-expanded={isOpen} onClick={() => setOpen(true)}>
        <ShoppingBag aria-hidden="true" />
        <span className="cart-count" aria-hidden="true">{count}</span>
      </button>
      <dialog
        ref={dialogRef}
        className="cart-dialog"
        aria-labelledby="cart-title"
        onClose={() => setOpen(false)}
        onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      >
        <section className="cart-drawer">
          <header className="cart-drawer-header">
            <div><p className="eyebrow">FISH GUY</p><h2 id="cart-title">Your cart <span>({count})</span></h2></div>
            <button className="drawer-close" type="button" aria-label="Close cart" onClick={() => setOpen(false)}><X aria-hidden="true" /></button>
          </header>

          {lines.length === 0 ? (
            <div className="cart-empty" role="status">
              <ShoppingBag aria-hidden="true" />
              <h3>Your cart is empty</h3>
              <p>Add something cold and good.</p>
              <Link href="/shop" className="button button-outline" onClick={() => setOpen(false)}>Browse the shop</Link>
            </div>
          ) : (
            <ul className="cart-lines">
              {lines.map((l) => (
                <li className="cart-line" key={l.productId}>
                  <div className="cart-line-info">
                    <Link href={`/shop/${l.slug}`} onClick={() => setOpen(false)}>{l.name}</Link>
                    <span>{naira(l.priceKobo)} / {l.unit}</span>
                  </div>
                  <div className="qty-stepper" aria-label={`Quantity of ${l.name}`}>
                    <button type="button" aria-label="Decrease" onClick={() => setQty(l.productId, l.qty - 1)}><Minus aria-hidden="true" /></button>
                    <output>{l.qty}</output>
                    <button type="button" aria-label="Increase" disabled={l.qty >= l.maxQty} onClick={() => setQty(l.productId, l.qty + 1)}><Plus aria-hidden="true" /></button>
                  </div>
                  <strong className="cart-line-total">{naira(l.priceKobo * l.qty)}</strong>
                  <button className="cart-line-remove" type="button" aria-label={`Remove ${l.name}`} onClick={() => remove(l.productId)}><X aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
          )}

          {lines.length > 0 && <CartAddOns />}

          {lines.length > 0 && <PromoProgress />}

          {lines.length > 0 && <DeliveryEstimate />}

          <div className="cart-drawer-footer">
            <div className="cart-subtotal"><span>Subtotal</span><strong>{naira(subtotalKobo)}</strong></div>
            <p>Delivery fee and time slot are chosen at checkout.</p>
            <WhatsAppLink text="Hello Fish Guy, I have a question about my cart." label="Questions? Chat on WhatsApp" />
            {lines.length > 0 ? (
              <Link href="/checkout" className="button button-gold" onClick={() => setOpen(false)}>Continue to checkout</Link>
            ) : (
              <button className="button button-gold" type="button" disabled>Continue to checkout</button>
            )}
          </div>
        </section>
      </dialog>
    </>
  );
}
