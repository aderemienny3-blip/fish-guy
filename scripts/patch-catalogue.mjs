// Catalogue and growth kit: catalogue health and size guide, bulk requests, category pages,
// contact block, error alerts, music switch, student duplicate flags. Safe to re-run.
import fs from "node:fs";
for (const f of ["lib/audit.ts", "lib/message-log.ts", "lib/attribution.ts", "components/admin/ui.tsx"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the earlier zips first (tracking, checkout, ops), then run this again.`); process.exit(1); }
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
    src = src.replace(from, () => to); changed = true; console.log(`done ${file}: ${label}`);
  }
  if (changed) fs.writeFileSync(file, crlf ? src.replace(/\n/g, "\r\n") : src);
}

// 1. Database
patch("prisma/schema.prisma", [
  { label: "size guide", done: "  sizeGuide   String? //", from: "  costKobo    Int? // what one unit costs you, kobo. Empty = not set\n", to: "  costKobo    Int? // what one unit costs you, kobo. Empty = not set\n  sizeGuide   String? // what a customer gets per kg or pack, shown on the product page\n" },
  { label: "music switch", done: "  musicEnabled           Boolean  @default(true)", from: "  heroAlt                String?\n}", to: "  heroAlt                String?\n  musicEnabled           Boolean  @default(true)\n}" },
  {
    label: "bulk requests", done: "model BulkQuote {",
    from: "model FunnelEvent {",
    to: `model BulkQuote {
  id        String   @id @default(cuid())
  name      String
  phone     String
  business  String?
  items     String
  area      String?
  neededBy  String?
  status    String   @default("NEW")
  note      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status, createdAt])
  @@index([phone, createdAt])
}

model FunnelEvent {`,
  },
]);

// 2. Product data and page: size guide, category links
patch("lib/shop/data.ts", [
  { label: "type", done: "  sizeGuide: string | null;\n", from: "  description: string | null;\n  category: string | null;", to: "  description: string | null;\n  sizeGuide: string | null;\n  category: string | null;" },
  { label: "value", done: "  sizeGuide: p.sizeGuide,\n", from: "  description: p.description,\n", to: "  description: p.description,\n  sizeGuide: p.sizeGuide,\n" },
]);
patch("app/(site)/shop/[productSlug]/page.tsx", [
  {
    label: "size guide", done: "product-size-guide",
    from: '{p.description && <p className="product-detail-description">{p.description}</p>}',
    to: '{p.description && <p className="product-detail-description">{p.description}</p>}\n          {p.sizeGuide && <p className="product-detail-description product-size-guide"><strong>Size guide:</strong> {p.sizeGuide}</p>}',
  },
  { label: "category link", done: "`/category/${p.categorySlug}`", from: "href={`/shop?category=${p.categorySlug}`}", to: "href={`/category/${p.categorySlug}`}" },
]);

// 3. Music switch: header, footer, home strip, sitemap
patch("components/music/site-shell.tsx", [
  { label: "import", done: "getSiteFlags", from: "import { PlayMusicButton } from '@/components/music/play-music-button'\n", to: "import { PlayMusicButton } from '@/components/music/play-music-button'\nimport { getSiteFlags } from '@/lib/site-flags'\nimport { fmt12 } from '@/lib/admin/format'\n" },
  { label: "header setup", done: "export async function SiteHeader()", from: "export function SiteHeader() {\n  return (", to: "export async function SiteHeader() {\n  const flags = await getSiteFlags()\n  const music = flags.music\n  return (" },
  { label: "header sounds link", done: "{music && <Link href=\"/sounds\" className=\"nav-link\">", from: '        <Link href="/sounds" className="nav-link">Sounds</Link>\n', to: '        {music && <Link href="/sounds" className="nav-link">Sounds</Link>}\n' },
  { label: "header hours", done: "Open {fmt12(flags.openMinute)}", from: "Open 8:30 AM – 9:00 PM</span>", to: "Open {fmt12(flags.openMinute)} – {fmt12(flags.closeMinute)}</span>" },
  { label: "header music button", done: '{music && <PlayMusicButton variant="header" />}', from: '        <PlayMusicButton variant="header" />\n', to: '        {music && <PlayMusicButton variant="header" />}\n' },
  { label: "footer setup", done: "export async function SiteFooter()", from: "export function SiteFooter() {\n  return (", to: "export async function SiteFooter() {\n  const music = (await getSiteFlags()).music\n  return (" },
  { label: "footer tagline", done: 'music ? "Frozen food for Lagos. Independent', from: "<p>Frozen food for Lagos. Independent sounds for the kitchen.</p>", to: '<p>{music ? "Frozen food for Lagos. Independent sounds for the kitchen." : "Frozen food for Lagos."}</p>' },
  {
    label: "footer links", done: "Bulk and event orders",
    from: `        <Link href="/sounds">Sounds</Link>
        <Link href="/library">My library</Link>
        <Link href="/account">My account</Link>
        <Link href="/student">Student discount</Link>
        <Link href="/advertise">Advertise your music</Link>
        <Link href="/sounds/apply">Artist application</Link>
        <Link href="/report-track">Report a copyright issue</Link>
        <Link href="/artist/login">Artist sign in</Link>
        <Link href="/business">Order for your business</Link>
        <Link href="/label/login">Label sign in</Link>
`,
    to: `        {music && <Link href="/sounds">Sounds</Link>}
        {music && <Link href="/library">My library</Link>}
        <Link href="/account">My account</Link>
        <Link href="/student">Student discount</Link>
        {music && <Link href="/advertise">Advertise your music</Link>}
        {music && <Link href="/sounds/apply">Artist application</Link>}
        {music && <Link href="/report-track">Report a copyright issue</Link>}
        {music && <Link href="/artist/login">Artist sign in</Link>}
        <Link href="/business">Order for your business</Link>
        <Link href="/bulk">Bulk and event orders</Link>
        {music && <Link href="/label/login">Label sign in</Link>}
`,
  },
]);
patch("components/shop/storefront-home.tsx", [
  { label: "hide empty listening strip", done: "{freeTracks.length > 0 && <FreeStreamStrip", from: "      <FreeStreamStrip tracks={freeTracks} />", to: "      {freeTracks.length > 0 && <FreeStreamStrip tracks={freeTracks} />}" },
]);
patch("app/(site)/page.tsx", [
  { label: "import", done: 'from "@/lib/site-flags"', from: 'import { getShopPlaylistTracks } from "@/lib/music/playlists";\n', to: 'import { getShopPlaylistTracks } from "@/lib/music/playlists";\nimport { getSiteFlags } from "@/lib/site-flags";\n' },
  { label: "no music when off", done: "!(await getSiteFlags()).music ? []", from: "const freeTracks = curated.length ? curated.slice(0, 6) : sounds.tracks.filter((t) => t.isFreeToStream && t.canPlay).slice(0, 3);", to: "const freeTracks = !(await getSiteFlags()).music ? [] : curated.length ? curated.slice(0, 6) : sounds.tracks.filter((t) => t.isFreeToStream && t.canPlay).slice(0, 3);" },
]);
patch("app/sitemap.ts", [
  { label: "import", done: 'from "@/lib/site-flags"', from: 'import { siteUrl } from "@/lib/seo";\n', to: 'import { siteUrl } from "@/lib/seo";\nimport { getSiteFlags } from "@/lib/site-flags";\nimport { slugifyCategory } from "@/lib/shop/format";\n' },
  { label: "bulk page", done: '"/bulk"', from: '"/business", "/sounds"', to: '"/business", "/bulk", "/sounds"' },
  { label: "read category", done: "select: { slug: true, updatedAt: true, category: true, isAddOn: true }", from: "select: { slug: true, updatedAt: true }", to: "select: { slug: true, updatedAt: true, category: true, isAddOn: true }" },
  {
    label: "category pages", done: "/category/${slug}",
    from: "    for (const t of tracks)",
    to: "    for (const slug of new Set(products.filter((p) => p.category && !p.isAddOn).map((p) => slugifyCategory(p.category as string)))) out.push({ url: `${base}/category/${slug}`, changeFrequency: \"daily\", priority: 0.8 });\n    for (const t of tracks)",
  },
  { label: "hide music pages when off", done: "getSiteFlags()).music", from: "  return out;\n}", to: "  if (!(await getSiteFlags()).music) return out.filter((e) => !/\\/(sounds|artists)(\\/|$)/.test(e.url));\n  return out;\n}" },
]);

// 4. Contact page: hours and delivery areas from the database
patch("app/(site)/contact/page.tsx", [
  { label: "imports", done: 'from "@/lib/site-flags"', from: 'import { BUSINESS, hasContact } from "@/lib/business";\n', to: 'import { BUSINESS, hasContact } from "@/lib/business";\nimport { db } from "@/lib/db";\nimport { getSiteFlags } from "@/lib/site-flags";\nimport { fmt12 } from "@/lib/admin/format";\nimport { formatNaira } from "@/lib/money";\n' },
  {
    label: "load", done: "const flags = await getSiteFlags();",
    from: "export default function ContactPage() {\n",
    to: 'export const dynamic = "force-dynamic";\n\nexport default async function ContactPage() {\n  const flags = await getSiteFlags();\n  const zones = await db.deliveryZone.findMany({ where: { active: true, isPickup: false }, orderBy: { name: "asc" }, select: { id: true, name: true, feeKobo: true, freeOverKobo: true } }).catch(() => []);\n',
  },
  {
    label: "hours and areas", done: "Where we deliver",
    from: '      <Section title="Opening hours">\n        <p>Every day, 8:30 AM to 9:00 PM (Lagos time).</p>\n      </Section>',
    to: `      <Section title="Opening hours">
        <p>Every day, {fmt12(flags.openMinute)} to {fmt12(flags.closeMinute)} (Lagos time).</p>
      </Section>
      {zones.length > 0 && (
        <Section title="Where we deliver">
          <ul className="legal-list">
            {zones.map((z) => <li key={z.id}>{z.name}: {formatNaira(z.feeKobo)}{z.freeOverKobo ? \`, free over \${formatNaira(z.freeOverKobo)}\` : ""}</li>)}
          </ul>
        </Section>
      )}`,
  },
]);

// 5. Students: flag possible duplicates
patch("app/admin/(panel)/students/page.tsx", [
  { label: "import", done: 'from "@/lib/student-flags"', from: 'import { getStudentRules } from "@/lib/student";\n', to: 'import { getStudentRules } from "@/lib/student";\nimport { studentFlags } from "@/lib/student-flags";\n' },
  { label: "load flags", done: "const flags = await studentFlags(pending);", from: "  const school = (v: {", to: "  const flags = await studentFlags(pending);\n  const school = (v: {" },
  {
    label: "show flags", done: "flags.get(v.id)",
    from: '                <p className="text-xs text-[#9A9585]">Applied {fmtDateTime(v.createdAt)}</p>',
    to: '                <p className="text-xs text-[#9A9585]">Applied {fmtDateTime(v.createdAt)}</p>\n                {(flags.get(v.id) ?? []).map((f) => <p key={f} className="mt-1 text-xs text-orange-300">Check: {f}</p>)}',
  },
]);

// 6. Admin menu
patch("app/admin/(panel)/layout.tsx", [
  {
    label: "menu", done: "/admin/catalogue",
    from: '  { href: "/admin/margins", label: "Cost and margin", roles: MGR },\n',
    to: '  { href: "/admin/margins", label: "Cost and margin", roles: MGR },\n  { href: "/admin/catalogue", label: "Catalogue health", roles: MGR },\n  { href: "/admin/bulk", label: "Bulk requests", roles: MGR },\n  { href: "/admin/switches", label: "Site switches", roles: MGR },\n',
  },
]);

console.log(problems ? `\n${problems} step(s) were skipped. Send me the SKIP lines.` : "\nAll done.");
