// Adds WhatsApp order alerts, customer sign-in (My account) and one-tap reorder. Safe to run more than once.
// Needs the alerts update (lib/notify.ts) installed first.
// Run in the project folder:  node scripts/patch-account-whatsapp.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync("lib/notify.ts") || !existsSync("lib/customer-auth.ts")) {
  console.log("Install the alerts update (fish-guy-alerts.zip) and the shop base first, then run this again.");
  process.exit(1);
}

let problems = 0;
function patch(file, steps) {
  if (!existsSync(file)) { console.log(`MISSING  ${file}`); problems++; return; }
  let s = readFileSync(file, "utf8");
  const crlf = s.includes("\r\n");
  if (crlf) s = s.replace(/\r\n/g, "\n");
  let changed = 0;
  for (const st of steps) {
    if (s.includes(st.done)) continue;
    if (!s.includes(st.find)) { console.log(`CANNOT PATCH  ${file}  (could not find: ${st.find.split("\n")[0].trim()})`); problems++; continue; }
    s = s.replace(st.find, st.replace);
    changed++;
  }
  if (changed) writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`${changed ? "patched " : "ok      "} ${file}`);
}

// New-order WhatsApp alert when an order is paid (and when a refund is needed).
patch("lib/payments.ts", [
  { done: "alertOwner", find: 'import { notifyNeedsRefund, notifyOrderPaid } from "@/lib/notify";', replace: 'import { notifyNeedsRefund, notifyOrderPaid } from "@/lib/notify";\nimport { alertOwner, orderAlertText, refundAlertText } from "@/lib/whatsapp";' },
  { done: "alertOwner(orderAlertText(full))", find: "        if (full) await notifyOrderPaid(full);", replace: "        if (full) {\n          await alertOwner(orderAlertText(full));\n          await notifyOrderPaid(full);\n        }" },
  { done: "alertOwner(refundAlertText", find: "        await notifyNeedsRefund(settled.order);", replace: "        await alertOwner(refundAlertText(settled.order));\n        await notifyNeedsRefund(settled.order);" },
]);

// Login codes: WhatsApp first, SMS as a backup.
patch("lib/otp.ts", [
  { done: "sendWhatsAppOtp", find: 'import { normalizeNgPhone } from "@/lib/phone";', replace: 'import { normalizeNgPhone } from "@/lib/phone";\nimport { sendWhatsAppOtp, whatsappConfigured } from "@/lib/whatsapp";' },
  { done: "Login codes are not available", find: "  await sendSms(phone, `Your Fish Guy code is ${code}. It expires in 5 minutes.`);\n  return { ok: true };",
    replace: `  // WhatsApp first (cheap and reliable in Nigeria), then SMS if you have set that up.
  if (whatsappConfigured() && (await sendWhatsAppOtp(phone, code))) return { ok: true };
  if (!process.env.TERMII_API_KEY) return { ok: false, error: "Login codes are not available right now. Please try again later." };
  try {
    await sendSms(phone, \`Your Fish Guy code is \${code}. It expires in 5 minutes.\`);
  } catch {
    return { ok: false, error: "We could not send your code. Please try again." };
  }
  return { ok: true };` },
]);

// Links to My account.
patch("components/music/site-shell.tsx", [
  { done: 'href="/account" className="nav-link"', find: '<Link href="/orders" className="nav-link">Orders</Link>', replace: '<Link href="/orders" className="nav-link">Orders</Link>\n        <Link href="/account" className="nav-link">Account</Link>' },
  { done: '<Link href="/account">My account</Link>', find: '<Link href="/library">My library</Link>', replace: '<Link href="/library">My library</Link>\n        <Link href="/account">My account</Link>' },
]);
patch("app/(site)/layout.tsx", [
  { done: 'import "./account.css"', find: 'import "./site.css";', replace: 'import "./site.css";\nimport "./account.css";' },
]);
patch("app/admin/(panel)/layout.tsx", [
  { done: "/admin/alerts", find: '  { href: "/admin/delivery", label: "Delivery", roles: MGR },', replace: '  { href: "/admin/delivery", label: "Delivery", roles: MGR },\n  { href: "/admin/alerts", label: "Order alerts", roles: MGR },' },
]);

console.log(problems ? `\n${problems} problem(s) above. Tell me what it printed.` : "\nAll done.");
