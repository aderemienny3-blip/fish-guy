"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function OrderLookup() {
  const router = useRouter();
  const [error, setError] = useState("");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ref = String(new FormData(e.currentTarget).get("reference") ?? "").trim().toUpperCase();
    if (!/^FG-[A-F0-9]{16}$/.test(ref)) { setError("Enter the order number exactly as shown, for example FG-1A2B3C4D5E6F7A8B."); return; }
    router.push(`/order/${ref}`);
  }

  return (
    <form className="checkout-shell lookup-form" onSubmit={submit}>
      <label>Order number<input name="reference" placeholder="FG-..." autoComplete="off" required /></label>
      {error && <p className="form-message is-error" role="alert">{error}</p>}
      <button className="button button-gold" type="submit">Track order</button>
    </form>
  );
}
