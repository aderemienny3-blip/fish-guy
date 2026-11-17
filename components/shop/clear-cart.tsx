"use client";

import { useEffect } from "react";
import { useCart } from "@/components/shop/cart";

// Once an order is paid, the cart that produced it should be empty.
export function ClearCart() {
  const { clear, ready } = useCart();
  useEffect(() => { if (ready) clear(); }, [ready, clear]);
  return null;
}
