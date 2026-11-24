// Label accounts (paid, approved, team logins), one email per artist, and the verified artist tag.
// Needs the meta zip installed first. Safe to re-run.
import fs from "node:fs";
for (const f of ["components/artist/roster-overview.tsx", "lib/music/isrc.ts", "app/(site)/artist/page.tsx"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the earlier zips first (meta, polish, protect), then run this again.`); process.exit(1); }
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
    src = src.replace(from, to); changed = true; console.log(`done ${file}: ${label}`);
  }
  if (changed) fs.writeFileSync(file, crlf ? src.replace(/\n/g, "\r\n") : src);
}

// 1. Database
patch("prisma/schema.prisma", [
  {
    label: "artist fields", done: "verifiedAt DateTime?",
    from: "  announcements FanAnnouncement[]\n",
    to: "  announcements FanAnnouncement[]\n  labelId    String?\n  verifiedAt DateTime?\n  label      Label?   @relation(fields: [labelId], references: [id], onDelete: SetNull)\n",
  },
  {
    label: "label models", done: "model Label {",
    from: "model ArtistCode {",
    to: `enum LabelStatus {
  UNVERIFIED
  PENDING
  APPROVED
  REJECTED
}

model Label {
  id              String         @id @default(cuid())
  name            String
  ownerEmail      String         @unique
  status          LabelStatus    @default(UNVERIFIED)
  emailVerifiedAt DateTime?
  approvedAt      DateTime?
  paidUntil       DateTime?
  rejectNote      String?
  createdAt       DateTime       @default(now())
  members         LabelMember[]
  artists         Artist[]
  payments        LabelPayment[]
}

model LabelMember {
  id        String   @id @default(cuid())
  labelId   String
  email     String   @unique
  role      String   @default("MANAGER")
  createdAt DateTime @default(now())
  label     Label    @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@index([labelId])
}

model LabelPayment {
  id          String    @id @default(cuid())
  labelId     String
  reference   String    @unique
  amountKobo  Int
  status      String    @default("PENDING")
  createdAt   DateTime  @default(now())
  paidAt      DateTime?
  label       Label     @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@index([labelId])
}

model ArtistCode {`,
  },
]);

// 2. The verified tag
patch("lib/music/data.ts", [
  { label: "artist type", done: "verifiedAt: Date | null;", from: "  isFeatured: boolean;\n};", to: "  isFeatured: boolean;\n  verifiedAt: Date | null;\n};" },
  { label: "track type", done: "artistVerified: boolean;", from: "  isSuperfanOnly: boolean;\n  artistId: string;\n};", to: "  isSuperfanOnly: boolean;\n  artistId: string;\n  artistVerified: boolean;\n};" },
  { label: "track value", done: "artistVerified: Boolean(", from: "    artistId: t.artistId,\n  };", to: "    artistId: t.artistId,\n    artistVerified: Boolean(t.artist.verifiedAt),\n  };" },
]);
patch("components/music/track-card.tsx", [
  { label: "import", done: "import { VerifiedBadge }", from: "import { CoverArtwork } from '@/components/music/site-shell'", to: "import { CoverArtwork } from '@/components/music/site-shell'\nimport { VerifiedBadge } from '@/components/music/verified-badge'" },
  { label: "badge", done: "{track.artistVerified && <VerifiedBadge />}", from: 'className="track-artist">{track.artistName}</Link>', to: 'className="track-artist">{track.artistName}{track.artistVerified && <VerifiedBadge />}</Link>' },
]);
patch("components/music/hero-release.tsx", [
  { label: "import", done: "import { VerifiedBadge }", from: "import { CoverArtwork } from '@/components/music/site-shell'", to: "import { CoverArtwork } from '@/components/music/site-shell'\nimport { VerifiedBadge } from '@/components/music/verified-badge'" },
  { label: "badge", done: "{track.artistVerified && <VerifiedBadge />}", from: 'className="hero-release-artist">{track.artistName}</Link>', to: 'className="hero-release-artist">{track.artistName}{track.artistVerified && <VerifiedBadge />}</Link>' },
]);
patch("components/music/top-ten.tsx", [
  { label: "import", done: "import { VerifiedBadge }", from: "import { CoverArtwork } from '@/components/music/site-shell'", to: "import { CoverArtwork } from '@/components/music/site-shell'\nimport { VerifiedBadge } from '@/components/music/verified-badge'" },
  { label: "badge", done: "{track.artistVerified && <VerifiedBadge />}", from: "{track.artistName}</Link>", to: "{track.artistName}{track.artistVerified && <VerifiedBadge />}</Link>" },
]);
patch("app/(site)/sounds/[trackSlug]/page.tsx", [
  { label: "import", done: "import { VerifiedBadge }", from: "import Link from 'next/link'", to: "import Link from 'next/link'\nimport { VerifiedBadge } from '@/components/music/verified-badge'" },
  { label: "badge", done: "{track.artistVerified && <VerifiedBadge />}", from: 'className="track-artist">{track.artistName}</Link>', to: 'className="track-artist">{track.artistName}{track.artistVerified && <VerifiedBadge />}</Link>' },
]);
patch("app/(site)/artists/[artistSlug]/page.tsx", [
  { label: "import", done: "import { VerifiedBadge }", from: "import Link from 'next/link'", to: "import Link from 'next/link'\nimport { VerifiedBadge } from '@/components/music/verified-badge'" },
  { label: "badge", done: "{artist.verifiedAt && <VerifiedBadge />}", from: '<h1 id="artist-title">{artist.name}</h1>', to: '<h1 id="artist-title">{artist.name}{artist.verifiedAt && <VerifiedBadge />}</h1>' },
]);

// 3. Labels can open their artists' dashboards
patch("app/(site)/artist/page.tsx", [
  { label: "imports", done: "getArtistAccess", from: 'import { getArtistEmail } from "@/lib/artist-auth";', to: 'import { getArtistAccess } from "@/lib/artist-access";\nimport { getLabelAccess } from "@/lib/label-auth";' },
  {
    label: "who is looking", done: "const access = await getArtistAccess();",
    from: '  const email = await getArtistEmail();\n  if (!email) redirect("/artist/login");\n  const q = await searchParams;\n  const artists = await db.artist.findMany({ where: { email }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });\n',
    to: '  const access = await getArtistAccess();\n  if (!access) redirect((await getLabelAccess()) ? "/label" : "/artist/login");\n  const { email, artists } = access;\n  const q = await searchParams;\n',
  },
]);
patch("app/(site)/artist/announce-actions.ts", [
  { label: "import", done: "getArtistAccess", from: 'import { getArtistEmail } from "@/lib/artist-auth";', to: 'import { getArtistAccess } from "@/lib/artist-access";' },
  { label: "who is sending", done: "const access = await getArtistAccess();", from: '  const email = await getArtistEmail();\n  if (!email) redirect("/artist/login");\n', to: '  const access = await getArtistAccess();\n  if (!access) redirect("/artist/login");\n' },
  { label: "own artist only", done: "access.artists.find", from: '  const artist = await db.artist.findFirst({ where: { id: artistId, email }, select: { id: true } });\n', to: '  const artist = access.artists.find((a) => a.id === artistId);\n' },
]);
patch("app/api/artist/fans/route.ts", [
  { label: "import", done: "getArtistAccess", from: 'import { getArtistEmail } from "@/lib/artist-auth";', to: 'import { getArtistAccess } from "@/lib/artist-access";' },
  {
    label: "who is asking", done: "const access = await getArtistAccess();",
    from: '  const email = await getArtistEmail();\n  if (!email) return new Response("Please sign in.", { status: 401 });\n  const wanted = new URL(request.url).searchParams.get("a");\n  const artists = await db.artist.findMany({ where: { email }, select: { id: true, slug: true } });\n',
    to: '  const access = await getArtistAccess();\n  if (!access) return new Response("Please sign in.", { status: 401 });\n  const wanted = new URL(request.url).searchParams.get("a");\n  const artists = access.artists;\n',
  },
]);
patch("app/(site)/artist/actions.ts", [
  { label: "import", done: "endLabelSession", from: 'import { cleanEmail, endArtistSession,', to: 'import { endLabelSession } from "@/lib/label-auth";\nimport { cleanEmail, endArtistSession,' },
  { label: "sign out of both", done: "await endLabelSession();", from: "  await endArtistSession();\n", to: "  await endArtistSession();\n  await endLabelSession();\n" },
]);

// 4. Payments: the Paystack webhook also settles label fees
patch("app/api/webhooks/paystack/route.ts", [
  { label: "import", done: "confirmLabelPayment", from: 'import { MUSIC_REF, confirmMusicOrder } from "@/lib/music/payments";', to: 'import { MUSIC_REF, confirmMusicOrder } from "@/lib/music/payments";\nimport { LABEL_PAY_REF } from "@/lib/label-rules";\nimport { confirmLabelPayment } from "@/lib/label-payments";' },
  { label: "label fees", done: 'ref.startsWith("FGL-")', from: '      } else if (ref.startsWith("FGS-")) {', to: '      } else if (ref.startsWith("FGL-")) {\n        if (LABEL_PAY_REF.test(ref)) await confirmLabelPayment(ref);\n      } else if (ref.startsWith("FGS-")) {' },
]);

// 5. One email per artist, in admin too
patch("app/admin/(panel)/music/actions.ts", [
  { label: "import", done: "emailInUse", from: 'import { normalizeIsrc } from "@/lib/music/isrc";', to: 'import { normalizeIsrc } from "@/lib/music/isrc";\nimport { emailInUse } from "@/lib/label-data";' },
  {
    label: "approved applications", done: "That email is already used by another artist or label team.\");\n  const slug",
    from: "  const slug = await uniqueArtistSlug(app.artistName);\n  await db.$transaction",
    to: '  if (app.email && (await emailInUse(app.email))) bail("/admin/music/applications", "That email is already used by another artist or label team.");\n  const slug = await uniqueArtistSlug(app.artistName);\n  await db.$transaction',
  },
  {
    label: "edited artists", done: "Each artist needs their own email.",
    from: "  if (id) await db.artist.update({ where: { id }, data });\n",
    to: '  if (data.email) {\n    const current = id ? (await db.artist.findUnique({ where: { id }, select: { email: true } }))?.email : null;\n    if (data.email !== current && (await emailInUse(data.email, id || undefined))) bail(back, "That email is already used by another artist or label team. Each artist needs their own email.");\n  }\n  if (id) await db.artist.update({ where: { id }, data });\n',
  },
]);

// 6. Admin: label list, verified toggle
patch("app/admin/(panel)/layout.tsx", [{
  label: "admin menu", done: "/admin/music/labels",
  from: '  { href: "/admin/music/downloads", label: "Music downloads", roles: MGR },',
  to: '  { href: "/admin/music/downloads", label: "Music downloads", roles: MGR },\n  { href: "/admin/music/labels", label: "Label accounts", roles: MGR },',
}]);
patch("app/admin/(panel)/music/artists/[id]/page.tsx", [
  { label: "imports", done: "toggleVerified", from: 'import { Banner, PageHeader, card } from "@/components/admin/ui";', to: 'import { Banner, PageHeader, btn, btnGhost, card } from "@/components/admin/ui";\nimport { toggleVerified } from "./verify-actions";' },
  {
    label: "verified switch", done: "Verified artist",
    from: "<ArtistFields a={artist} /></form>\n",
    to: `<ArtistFields a={artist} /></form>
      <form action={toggleVerified} className={\`\${card} mt-6 max-w-2xl space-y-3 p-6\`}>
        <input type="hidden" name="id" value={artist.id} />
        <h2 className="text-lg font-medium">Verified artist</h2>
        <p className="text-sm text-[#9A9585]">{artist.verifiedAt ? "This artist shows a gold verified tag beside their name." : "Give the gold verified tag only after you have confirmed who this artist really is (their socials, ID, or distributor)."}</p>
        <button className={artist.verifiedAt ? btnGhost : btn}>{artist.verifiedAt ? "Remove verified tag" : "Verify this artist"}</button>
      </form>
`,
  },
]);

// 7. Site: styles and links
patch("app/(site)/layout.tsx", [{ label: "css", done: "label.css", from: 'import "./polish.css";', to: 'import "./polish.css";\nimport "./label.css";' }]);
patch("components/music/site-shell.tsx", [{
  label: "label sign in link", done: "/label/login",
  from: '<Link href="/artist/login">Artist sign in</Link>',
  to: '<Link href="/artist/login">Artist sign in</Link>\n        <Link href="/label/login">Label sign in</Link>',
}]);

console.log(problems ? "\nFinished with notes above. Send me the SKIP lines." : "\nAll done.");
