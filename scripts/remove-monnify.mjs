// Moves the WHOLE site (food, music, artist ads) to Paystack and removes every trace of Monnify.
// Safe to run more than once. Run in the project folder:  node scripts/remove-monnify.mjs
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

let problems = 0;

function edit(file, steps, { optional = false } = {}) {
  if (!existsSync(file)) { if (!optional) { console.log(`MISSING  ${file}`); problems++; } return; }
  let s = readFileSync(file, "utf8");
  const crlf = s.includes("\r\n");
  if (crlf) s = s.replace(/\r\n/g, "\n");
  const before = s;
  for (const fn of steps) {
    const out = fn(s);
    if (out === false) { console.log(`CANNOT PATCH  ${file}`); problems++; continue; }
    s = out;
  }
  if (s !== before) writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`${s !== before ? "patched " : "ok      "} ${file}`);
}

// helpers: each returns the new text, or false when an expected piece is missing
const sub = (from, to) => (s) => (s.includes(from) ? s.replace(from, to) : s);
const re = (rx, to) => (s) => s.replace(rx, to);
const ensureImport = (line, after) => (s) => (s.includes(line) ? s : after && s.includes(after) ? s.replace(after, `${after}\n${line}`) : `${line}\n${s}`);
/** Replace text from `start` through the end of the line containing `endMarker`. */
const region = (start, endMarker, replacement, skipIf) => (s) => {
  if (skipIf(s)) return s;
  const a = s.indexOf(start);
  const b = a < 0 ? -1 : s.indexOf(endMarker, a);
  if (a < 0 || b < 0) return false;
  let e = s.indexOf("\n", b);
  if (e < 0) e = s.length;
  return s.slice(0, a) + replacement + s.slice(e);
};

// ---- 1. Food orders: settle by asking Paystack ----
edit("lib/payments.ts", [
  re(/import \{ fetchTransaction \} from "@\/lib\/monnify";\n?/, ""),
  re(/import \{ fetchPaystackAsTxn \} from "@\/lib\/paystack";\n?/, ""),
  ensureImport('import { fetchPaystackAsTxn } from "@/lib/paystack";', 'import { db } from "@/lib/db";'),
  re(/  const txn = .*;\n/, "  const txn = await fetchPaystackAsTxn(payment.reference);\n"),
]);

// ---- 2. Music: settle + start payment ----
edit("lib/music/payments.ts", [
  re(/import \{ fetchTransaction, initTransaction \} from "@\/lib\/monnify";\n?/, ""),
  ensureImport('import { fetchPaystackAsTxn } from "@/lib/paystack";', 'import { db } from "@/lib/db";'),
  re(/\nexport \{ initTransaction as initMusicTransaction \};\n/, "\n"),
  re(/await fetchTransaction\(order\.providerRef\)/, "await fetchPaystackAsTxn(order.reference)"),
]);
edit("app/api/music/checkout/route.ts", [
  re(/import \{ initTransaction \} from "@\/lib\/monnify";/, 'import { initPaystack, isPaystackCheckoutUrl } from "@/lib/paystack";'),
  region("    const payment = await initTransaction({", "return reply({ checkoutUrl: payment.checkoutUrl }, request, token);",
`    const payment = await initPaystack({
      amountKobo: order.amountKobo,
      reference: order.reference,
      email: order.buyerEmail,
      callbackUrl: \`\${origin}/sounds/return?paymentReference=\${encodeURIComponent(order.reference)}\`,
    });
    if (!isPaystackCheckoutUrl(payment.authorizationUrl)) throw new Error("bad checkout host");
    await db.musicOrder.update({
      where: { id: order.id },
      data: { providerRef: payment.reference, checkoutUrl: payment.authorizationUrl },
    });
    return reply({ checkoutUrl: payment.authorizationUrl }, request, token);`,
    (s) => !s.includes("initTransaction")),
]);

// ---- 3. Artist ads ----
edit("lib/ads/payments.ts", [
  re(/import \{ fetchTransaction \} from "@\/lib\/monnify";/, 'import { fetchPaystackAsTxn } from "@/lib/paystack";'),
  re(/await fetchTransaction\(c\.providerRef\)/, "await fetchPaystackAsTxn(c.paymentRef)"),
  re(/c\.status !== "APPROVED" \|\| !c\.providerRef/, 'c.status !== "APPROVED" || !c.paymentRef'),
]);
edit("app/api/ads/pay/route.ts", [
  re(/import \{ initTransaction \} from "@\/lib\/monnify";/, 'import { initPaystack } from "@/lib/paystack";'),
  region("    const init = await initTransaction({", "    });",
`    const init = await initPaystack({
      amountKobo: c.priceKobo,
      reference: paymentRef,
      email: c.email,
      callbackUrl: \`\${process.env.NEXT_PUBLIC_SITE_URL}/advertise/\${c.reference}\`,
    });`, (s) => !s.includes("initTransaction")),
  sub("providerRef: init.transactionReference } });\n    return NextResponse.json({ checkoutUrl: init.checkoutUrl });", "providerRef: init.reference } });\n    return NextResponse.json({ checkoutUrl: init.authorizationUrl });"),
]);

// ---- 4. Food checkout: one gateway, no chooser ----
edit("app/api/checkout/route.ts", [
  re(/import \{ initTransaction \} from "@\/lib\/monnify";\n?/, ""),
  re(/import \{ pickProvider \} from "@\/lib\/payment-providers";\n?/, ""),
  ensureImport('import { initPaystack } from "@/lib/paystack";', 'import { db } from "@/lib/db";'),
  re(/\n  provider: z\.enum\(\["monnify", "paystack"\]\)\.optional\(\),/, ""),
  region("    const site = process.env.NEXT_PUBLIC_SITE_URL!;", "return NextResponse.json({ checkoutUrl",
`    const site = process.env.NEXT_PUBLIC_SITE_URL!;
    const init = await initPaystack({
      amountKobo: order.totalKobo,
      reference: order.reference,
      email: order.contactEmail,
      callbackUrl: \`\${site}/order/\${order.reference}\`,
    });

    await db.payment.create({
      data: {
        orderId: order.id,
        reference: order.reference,
        provider: "paystack",
        providerRef: init.reference,
        amountKobo: order.totalKobo,
      },
    });

    return NextResponse.json({ checkoutUrl: init.authorizationUrl, reference: order.reference });`,
    (s) => !s.includes("initTransaction") && !s.includes("pickProvider")),
]);
edit("components/shop/checkout-client.tsx", [
  re(/  const \[providers, setProviders\][\s\S]*?\n  \}, \[\]\);\n/, ""),
  re(/          provider: provider \|\| undefined,\n/, ""),
  re(/        \{providers\.length > 1 && \([\s\S]*?\n        \)\}\n/, ""),
  re(/You will be taken to (Monnify|our secure payment partner) to pay/, "You will be taken to Paystack to pay"),
]);

// ---- 5. Database default ----
edit("prisma/schema.prisma", [
  re(/provider(\s+)String(\s+)@default\("monnify"\)/, 'provider$1String$2@default("paystack")'),
  re(/providerRef String\? \/\/ Monnify transactionReference/, "providerRef String? // Paystack reference"),
]);

// ---- 6. Wording: no mention of any other gateway anywhere ----
const scrub = (s) =>
  s
    .replace(/\{p\.provider === "paystack" \? "Paystack" : "Monnify"\}/g, "Paystack")
    .replace(/\(Monnify or Paystack\)/g, "(Paystack)")
    .replace(/\(Monnify and Paystack\)/g, "(Paystack)")
    .replace(/our payment partners \(Paystack\)/g, "Paystack")
    .replace(/Monnify (or|and) Paystack/g, "Paystack")
    .replace(/Monnify/g, "Paystack")
    .replace(/MONNIFY/g, "PAYSTACK")
    .replace(/Pay with Paystack"/g, 'Pay in naira"');
const SCRUB = [
  "app/admin/(panel)/orders/[reference]/page.tsx", "app/admin/(panel)/music/page.tsx", "app/(site)/library/page.tsx",
  "app/(site)/advertise/page.tsx", "app/(site)/advertise/[reference]/page.tsx", "app/(site)/order/[reference]/page.tsx",
  "app/(site)/sounds/return/page.tsx", "app/(site)/terms/page.tsx", "app/(site)/privacy/page.tsx",
  "components/music/payment-return-status.tsx", "components/music/checkout-form.tsx", "components/shop/storefront-home.tsx",
  "lib/notify.ts", "lib/payments.ts", "lib/music/payments.ts", "lib/ads/payments.ts", "app/api/webhooks/paystack/route.ts",
];
for (const f of SCRUB) edit(f, [scrub], { optional: true });

// ---- 7. Delete everything Monnify ----
for (const f of ["lib/monnify.ts", "lib/payment-providers.ts", "app/api/payments", "app/api/webhooks/monnify", "scripts/patch-paystack.mjs"]) {
  if (existsSync(f)) { rmSync(f, { recursive: true, force: true }); console.log(`deleted  ${f}`); }
}

// ---- 8. Final sweep ----
const hits = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "migrations", "remove-monnify.mjs"].includes(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx|mjs|js|css|prisma|json|md|txt)$/.test(name) && /monnify/i.test(readFileSync(p, "utf8"))) hits.push(p);
  }
}
for (const d of ["app", "lib", "components", "prisma", "scripts", "public"]) if (existsSync(d)) walk(d);
if (hits.length) { console.log("\nStill mentions Monnify:\n  " + hits.join("\n  ")); problems += hits.length; }
else console.log("\nNo mention of Monnify is left in the code.");

console.log(problems ? `\n${problems} problem(s) above. Tell me what it printed.` : "\nAll done.");
