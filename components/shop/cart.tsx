"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  priceKobo: number;
  unit: string;
  imageUrl: string | null;
  qty: number;
  maxQty: number;
};

type CartValue = {
  lines: CartLine[];
  ready: boolean;
  count: number;
  subtotalKobo: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const KEY = "fish-guy-cart-v1";
const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setOpen] = useState(false);

  // The cart lives in this browser only. Prices are re-checked on the server at checkout.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setLines(
          parsed.filter(
            (l): l is CartLine =>
              l && typeof l.productId === "string" && typeof l.qty === "number" && typeof l.priceKobo === "number" && l.qty >= 1,
          ),
        );
      }
    } catch {
      // Storage unavailable: the cart simply starts empty.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      // Ignore: cart still works for this visit.
    }
  }, [lines, ready]);

  const add = useCallback((line: Omit<CartLine, "qty">, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === line.productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === line.productId
            ? { ...l, ...line, qty: Math.min(line.maxQty, l.qty + qty) }
            : l,
        );
      }
      return [...prev, { ...line, qty: Math.max(1, Math.min(line.maxQty, qty)) }];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.productId !== productId) return [l];
        if (qty < 1) return [];
        return [{ ...l, qty: Math.min(l.maxQty, qty) }];
      }),
    );
  }, []);

  const remove = useCallback((productId: string) => setLines((prev) => prev.filter((l) => l.productId !== productId)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotalKobo: lines.reduce((n, l) => n + l.qty * l.priceKobo, 0),
      isOpen,
      setOpen,
      add,
      setQty,
      remove,
      clear,
    }),
    [lines, ready, isOpen, add, setQty, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider.");
  return ctx;
}
