import crypto from "node:crypto";

const BASE = process.env.MONNIFY_BASE_URL ?? "https://sandbox.monnify.com";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

let cached: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const basic = Buffer.from(
    `${required("MONNIFY_API_KEY")}:${required("MONNIFY_SECRET_KEY")}`
  ).toString("base64");

  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.requestSuccessful) {
    throw new Error(`Monnify auth failed: ${json.responseMessage ?? res.status}`);
  }
  const { accessToken, expiresIn } = json.responseBody;
  cached = { token: accessToken, expiresAt: Date.now() + expiresIn * 1000 };
  return accessToken;
}

export type InitResult = {
  transactionReference: string;
  paymentReference: string;
  checkoutUrl: string;
};

export async function initTransaction(args: {
  amountKobo: number;
  paymentReference: string;
  customerName: string;
  customerEmail: string;
  description: string;
  redirectUrl: string;
}): Promise<InitResult> {
  const token = await getToken();
  const res = await fetch(`${BASE}/api/v1/merchant/transactions/init-transaction`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: args.amountKobo / 100,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      paymentReference: args.paymentReference,
      paymentDescription: args.description,
      currencyCode: "NGN",
      contractCode: required("MONNIFY_CONTRACT_CODE"),
      redirectUrl: args.redirectUrl,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
    }),
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.requestSuccessful) {
    throw new Error(`Monnify init failed: ${json.responseMessage ?? res.status}`);
  }
  return json.responseBody as InitResult;
}

export type MonnifyTxn = {
  paymentStatus: string; // PAID, PENDING, FAILED, EXPIRED ...
  amountPaid: number; // naira
  paymentMethod?: string;
  transactionReference: string;
  paymentReference: string;
};

/** Always confirm with Monnify directly; never trust a webhook body alone. */
export async function fetchTransaction(transactionReference: string): Promise<MonnifyTxn> {
  const token = await getToken();
  const res = await fetch(
    `${BASE}/api/v2/transactions/${encodeURIComponent(transactionReference)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  const json = await res.json();
  if (!res.ok || !json.requestSuccessful) {
    throw new Error(`Monnify verify failed: ${json.responseMessage ?? res.status}`);
  }
  return json.responseBody as MonnifyTxn;
}

/** Monnify signs the raw webhook body with HMAC-SHA512 using your secret key. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha512", required("MONNIFY_SECRET_KEY"))
    .update(rawBody)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
