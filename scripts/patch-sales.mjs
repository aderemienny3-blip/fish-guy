// Pricing and releases: pay what you want, release dates and pre-orders, limited editions.
// Needs the artist-dashboard and copyright zips installed first. Safe to re-run.
// Run from the project root:  node scripts/patch-sales.mjs
import fs from "node:fs";

for (const f of ["lib/geo.ts", "lib/copyright.ts"]) {
  if (!fs.existsSync(f)) {
    console.log(`Stop: ${f} is missing. Install the artist-dashboard and copyright zips first, then run this again.`);
    process.exit(1);
  }
}

let problems = 0;
function patch(file, steps) {
  if (!fs.existsSync(file)) { console.log(`SKIP ${file} (not found)`); problems++; return; }
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let src = raw.replace(/\r\n/g, "\n");
  let changed = false;
  for (const { label, done, from, to } of steps) {
    if (src.includes(done)) { console.log(`ok   ${file}: ${label} (already done)`); continue; }
    if (!src.includes(from)) { console.log(`SKIP ${file}: ${label} (anchor not found)`); problems++; continue; }
    src = src.replace(from, to);
    changed = true;
    console.log(`done ${file}: ${label}`);
  }
  if (changed) fs.writeFileSync(file, crlf ? src.replace(/\n/g, "\r\n") : src);
}

patch("prisma/schema.prisma", [
  {
    label: "track sale fields", done: "payWhatYouWant",
    from: "  @@index([isPublished, releasedAt])",
    to: "  payWhatYouWant  Boolean          @default(false)\n  suggestedKobo   Int?\n  releaseAt       DateTime?\n  editionLimit    Int?\n\n  @@index([isPublished, releasedAt])",
  },
  { label: "edition number", done: "editionNo", from: "  downloadLinks MusicDownloadLink[]\n", to: "  editionNo     Int?\n  downloadLinks MusicDownloadLink[]\n" },
]);

patch("lib/music/payments.ts", [
  { label: "import", done: "assignEditionNumbers", from: 'import { fetchPaystackAsTxn } from "@/lib/paystack";', to: 'import { fetchPaystackAsTxn } from "@/lib/paystack";\nimport { assignEditionNumbers } from "@/lib/music/sales";' },
  {
    label: "number copies when already paid", done: "numbering failed (again)",
    from: '  if (order.status === "PAID") return true;',
    to: '  if (order.status === "PAID") {\n    await assignEditionNumbers(order.id).catch((e) => console.error("edition numbering failed (again)", e));\n    return true;\n  }',
  },
  {
    label: "number copies after payment", done: 'console.error("edition numbering failed", e)',
    from: '  return fresh?.status === "PAID";\n}\n\nexport async function confirmMusicOrderForSession',
    to: '  if (fresh?.status === "PAID") {\n    await assignEditionNumbers(order.id).catch((e) => console.error("edition numbering failed", e));\n    return true;\n  }\n  return false;\n}\n\nexport async function confirmMusicOrderForSession',
  },
]);

patch("app/api/music/stream/[trackId]/route.ts", [{
  label: "full audio only after release", done: "releaseAt",
  from: "  const path = track.isFreeToStream || owned ? track.mp3Path : track.previewPath;",
  to: "  const released = !track.releaseAt || track.releaseAt.getTime() <= Date.now();\n  const path = released && (track.isFreeToStream || owned) ? track.mp3Path : track.previewPath;",
}]);

patch("app/api/music/download-links/route.ts", [{
  label: "downloads only after release", done: "unlocks on",
  from: '  const path = format === "wav" ? item?.track.wavPath : item?.track.mp3Path;',
  to: '  if (item?.track.releaseAt && item.track.releaseAt.getTime() > Date.now()) {\n    const when = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(item.track.releaseAt);\n    return NextResponse.json({ error: `This release unlocks on ${when}. Your purchase is saved.` }, { status: 403 });\n  }\n  const path = format === "wav" ? item?.track.wavPath : item?.track.mp3Path;',
}]);

patch("components/music/checkout-form.tsx", [
  {
    label: "props", done: "payWhatYouWant = false",
    from: "export function CheckoutForm({ trackId, title, priceKobo }: { trackId: string; title: string; priceKobo: number }) {",
    to: "export function CheckoutForm({ trackId, title, priceKobo, payWhatYouWant = false, suggestedKobo = null, soldOut = false, preOrderLabel = '' }: { trackId: string; title: string; priceKobo: number; payWhatYouWant?: boolean; suggestedKobo?: number | null; soldOut?: boolean; preOrderLabel?: string }) {",
  },
  { label: "amount state", done: "const [amount, setAmount]", from: "  const idempotencyKey = useRef<string | null>(null)\n", to: "  const idempotencyKey = useRef<string | null>(null)\n  const [amount, setAmount] = useState(String((suggestedKobo ?? priceKobo) / 100))\n  const amountKobo = Math.round((Number(amount) || 0) * 100)\n" },
  { label: "send amount", done: "amountKobo: payWhatYouWant", from: "idempotencyKey: idempotencyKey.current", to: "idempotencyKey: idempotencyKey.current, amountKobo: payWhatYouWant ? amountKobo : undefined" },
  {
    label: "amount box", done: 'id="pay-amount"',
    from: '      <form className="checkout-form" onSubmit={submit}>\n',
    to: '      <form className="checkout-form" onSubmit={submit}>\n        {payWhatYouWant && (\n          <div className="form-field"><label htmlFor="pay-amount">Pay what you want (minimum {formatNaira(priceKobo)})</label><input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>\n        )}\n',
  },
  {
    label: "button", done: "preOrderLabel ? 'Pre-order'",
    from: "disabled={isPending}>{isPending ? 'Connecting…' : `Pay ${formatNaira(priceKobo)} securely`}",
    to: "disabled={isPending || soldOut || (payWhatYouWant && amountKobo < priceKobo)}>{soldOut ? 'Sold out' : isPending ? 'Connecting…' : `${preOrderLabel ? 'Pre-order' : 'Pay'} ${formatNaira(payWhatYouWant ? amountKobo : priceKobo)} securely`}",
  },
]);

patch("app/(site)/sounds/[trackSlug]/page.tsx", [
  { label: "import", done: "getSaleInfo", from: "import { formatNaira } from '@/lib/money'", to: "import { formatNaira } from '@/lib/money'\nimport { formatRelease, getSaleInfo } from '@/lib/music/sales'" },
  { label: "load sale info", done: "const sale = await getSaleInfo", from: "  if (!track) notFound()\n", to: "  if (!track) notFound()\n  const sale = await getSaleInfo(track.id)\n" },
  {
    label: "price and badges", done: "sale?.editionLeft",
    from: "<p className=\"track-price\">{track.priceKobo === 0 ? 'Free' : formatNaira(track.priceKobo)}</p>",
    to: "<p className=\"track-price\">{track.priceKobo === 0 ? 'Free' : sale?.payWhatYouWant ? `From ${formatNaira(track.priceKobo)}` : formatNaira(track.priceKobo)}</p>\n          {sale && !sale.released && sale.releaseAt && <p className=\"track-description\"><strong>Pre-order.</strong> Releases {formatRelease(sale.releaseAt)}. You can hear the 30-second preview now, and the full track unlocks automatically.</p>}\n          {sale?.payWhatYouWant && <p className=\"track-description\">Pay what you want. Minimum {formatNaira(track.priceKobo)}.</p>}\n          {sale && sale.editionLeft !== null && <p className=\"track-description\"><strong>Limited edition.</strong> {sale.editionLeft > 0 ? `${sale.editionLeft} of ${sale.editionLimit} copies left.` : `All ${sale.editionLimit} copies are sold.`}</p>}",
  },
  {
    label: "checkout props", done: "preOrderLabel=",
    from: "<CheckoutForm trackId={track.id} title={track.title} priceKobo={track.priceKobo} />",
    to: "<CheckoutForm trackId={track.id} title={track.title} priceKobo={track.priceKobo} payWhatYouWant={Boolean(sale?.payWhatYouWant)} suggestedKobo={sale?.suggestedKobo ?? null} soldOut={sale?.editionLeft === 0} preOrderLabel={sale && !sale.released ? 'preorder' : ''} />",
  },
]);

patch("app/admin/(panel)/music/page.tsx", [{
  label: "sale settings link", done: "/sale`",
  from: '<td className={td}>{t.isPublished ? "Live" : "Draft"}</td>',
  to: '<td className={td}>{t.isPublished ? "Live" : "Draft"}{t.releaseAt && t.releaseAt > new Date() ? " · pre-order" : ""}{t.editionLimit ? ` · edition of ${t.editionLimit}` : ""}{t.payWhatYouWant ? " · pay what you want" : ""}<br /><Link href={`/admin/music/tracks/${t.id}/sale`} className="text-xs text-[#D4AF37] underline">Sale settings</Link></td>',
}]);

console.log(problems ? "\nFinished with notes above. Send me the SKIP lines." : "\nAll done.");
