import crypto from "node:crypto";

const BASE = "https://api.paystack.co";

function secret(): string {
  const v = process.env.PAYSTACK_SECRET_KEY;
  if (!v) throw new Error("Missing env var PAYSTACK_SECRET_KEY");
  return v;
}

/** The shape every payment check returns (amountPaid is in naira). */
export type PaymentTxn = {
  paymentStatus: string; // PAID | PENDING | FAILED
  amountPaid: number;
  paymentMethod?: string;
  transactionReference: string;
  paymentReference: string;
};

export async function initPaystack(args: { amountKobo: number; reference: string; email: string; callbackUrl: string }) {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: args.email,
      amount: args.amountKobo, // Paystack takes kobo
      currency: "NGN",
      reference: args.reference,
      callback_url: args.callbackUrl,
      channels: ["card", "bank", "ussd", "bank_transfer"],
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.status || !json.data?.authorization_url) {
    throw new Error(`Paystack init failed: ${json.message ?? res.status}`);
  }
  return { authorizationUrl: json.data.authorization_url as string, reference: (json.data.reference as string) ?? args.reference };
}

/** The payment page must be on Paystack's own domain. */
export function isPaystackCheckoutUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "paystack.com" || u.hostname.endsWith(".paystack.com"));
  } catch {
    return false;
  }
}

/** Always confirm with Paystack directly; never trust a webhook body alone. */
export async function fetchPaystackAsTxn(reference: string): Promise<PaymentTxn> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret()}` },
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.status || !json.data) throw new Error(`Paystack verify failed: ${json.message ?? res.status}`);
  const d = json.data as { status: string; amount: number; currency?: string; channel?: string; reference: string };

  let paymentStatus = "PENDING";
  if (d.status === "success") paymentStatus = "PAID";
  else if (d.status === "failed" || d.status === "reversed") paymentStatus = "FAILED";
  // Only naira counts. A payment in another currency is never treated as paid.
  if (paymentStatus === "PAID" && d.currency && d.currency !== "NGN") paymentStatus = "PENDING";

  return {
    paymentStatus,
    amountPaid: paymentStatus === "PAID" ? d.amount / 100 : 0,
    paymentMethod: d.channel,
    transactionReference: d.reference,
    paymentReference: d.reference,
  };
}

/** Paystack signs the raw webhook body with HMAC-SHA512 using your secret key. */
export function verifyPaystackSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac("sha512", secret()).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
