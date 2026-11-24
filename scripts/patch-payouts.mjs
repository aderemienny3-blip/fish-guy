// Batch 4: split sheets, earnings ledger and payouts, plus the label-consent line in the Artist terms.
// Needs the labels zip installed first. Safe to re-run.
import fs from "node:fs";
for (const f of ["lib/label-rules.ts", "lib/music/isrc.ts", "app/(site)/artist/page.tsx"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the earlier zips first (meta, labels), then run this again.`); process.exit(1); }
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
  { label: "artist bank and links", done: "accountNumber", from: "  label      Label?   @relation(fields: [labelId], references: [id], onDelete: SetNull)\n", to: "  label      Label?   @relation(fields: [labelId], references: [id], onDelete: SetNull)\n  bankName      String?\n  accountNumber String?\n  accountName   String?\n  splits        TrackSplit[]\n  earnings      Earning[]\n  payouts       Payout[]\n" },
  { label: "track link", done: "TrackSplit[]\n  isrc", from: "  isrc            String?          @unique\n", to: "  splits          TrackSplit[]\n  isrc            String?          @unique\n" },
  { label: "sale link", done: "earnings Earning[]\n  downloadLinks", from: "  downloadsFrom DateTime?\n  downloadLinks MusicDownloadLink[]\n", to: "  downloadsFrom DateTime?\n  earnings Earning[]\n  downloadLinks MusicDownloadLink[]\n" },
  {
    label: "new models", done: "model Earning {",
    from: "enum LabelStatus {",
    to: `model PayoutSetting {
  id             String   @id @default("default")
  artistBps      Int
  minPayoutKobo  Int      @default(500000)
  updatedAt      DateTime @updatedAt
}

model TrackSplit {
  id        String   @id @default(cuid())
  trackId   String
  artistId  String
  bps       Int
  role      String   @default("Collaborator")
  createdAt DateTime @default(now())
  track     Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)
  artist    Artist   @relation(fields: [artistId], references: [id], onDelete: Cascade)

  @@unique([trackId, artistId])
  @@index([artistId])
}

model Payout {
  id            String    @id @default(cuid())
  artistId      String
  amountKobo    Int
  status        String    @default("REQUESTED")
  bankName      String
  accountNumber String
  accountName   String
  requestedAt   DateTime  @default(now())
  paidAt        DateTime?
  transferRef   String?
  note          String?
  artist        Artist    @relation(fields: [artistId], references: [id], onDelete: Restrict)
  earnings      Earning[]

  @@index([artistId])
  @@index([status])
}

model Earning {
  id          String          @id @default(cuid())
  orderItemId String
  artistId    String
  amountKobo  Int
  payoutId    String?
  createdAt   DateTime        @default(now())
  orderItem   MusicOrderItem  @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  artist      Artist          @relation(fields: [artistId], references: [id], onDelete: Restrict)
  payout      Payout?         @relation(fields: [payoutId], references: [id], onDelete: SetNull)

  @@unique([orderItemId, artistId])
  @@index([artistId, payoutId])
}

enum LabelStatus {`,
  },
]);

// 2. Every paid sale goes into the ledger
patch("lib/music/payments.ts", [
  { label: "import", done: "recordEarnings", from: 'import { assignEditionNumbers } from "@/lib/music/sales";', to: 'import { assignEditionNumbers } from "@/lib/music/sales";\nimport { recordEarnings } from "@/lib/music/earnings";' },
  {
    label: "record when already paid", done: 'earnings failed (again)',
    from: '    await assignEditionNumbers(order.id).catch((e) => console.error("edition numbering failed (again)", e));\n',
    to: '    await assignEditionNumbers(order.id).catch((e) => console.error("edition numbering failed (again)", e));\n    await recordEarnings(order.id).catch((e) => console.error("earnings failed (again)", e));\n',
  },
  {
    label: "record on payment", done: 'earnings failed", e',
    from: '    await assignEditionNumbers(order.id).catch((e) => console.error("edition numbering failed", e));\n',
    to: '    await assignEditionNumbers(order.id).catch((e) => console.error("edition numbering failed", e));\n    await recordEarnings(order.id).catch((e) => console.error("earnings failed", e));\n',
  },
]);

// 3. Artist dashboard: earnings section
patch("app/(site)/artist/page.tsx", [
  { label: "import", done: "import { Earnings }", from: 'import { RosterOverview } from "@/components/artist/roster-overview";', to: 'import { RosterOverview } from "@/components/artist/roster-overview";\nimport { Earnings } from "@/components/artist/earnings";' },
  { label: "page params", done: "esaved?: string", from: "searchParams: Promise<{ a?: string; announced?: string; error?: string }>", to: "searchParams: Promise<{ a?: string; announced?: string; error?: string; esaved?: string; eerror?: string }>" },
  { label: "bank details", done: "const bank = await", from: "  const artist = artists.find((x) => x.id === q.a) ?? artists[0];\n", to: "  const artist = artists.find((x) => x.id === q.a) ?? artists[0];\n  const bank = await db.artist.findUnique({ where: { id: artist.id }, select: { bankName: true, accountNumber: true, accountName: true } });\n" },
  {
    label: "earnings section", done: "<Earnings ",
    from: '      <section className="ad-block">\n        <h2>Recent buyers</h2>',
    to: '      <Earnings artist={{ id: artist.id, bankName: bank?.bankName ?? null, accountNumber: bank?.accountNumber ?? null, accountName: bank?.accountName ?? null }} canRequest={access.via === "artist"} saved={q.esaved} error={q.eerror} />\n\n      <section className="ad-block">\n        <h2>Recent buyers</h2>',
  },
]);

// 4. Admin
patch("app/admin/(panel)/layout.tsx", [{
  label: "admin menu", done: "/admin/music/payouts",
  from: '  { href: "/admin/music/labels", label: "Label accounts", roles: MGR },',
  to: '  { href: "/admin/music/labels", label: "Label accounts", roles: MGR },\n  { href: "/admin/music/payouts", label: "Payouts and splits", roles: MGR },',
}]);
patch("app/admin/(panel)/music/tracks/[id]/sale/page.tsx", [{
  label: "split sheet link", done: "/splits`",
  from: 'actions={<Link href="/admin/music" className={btnGhost}>Back to music</Link>}',
  to: 'actions={<><Link href={`/admin/music/tracks/${t.id}/splits`} className={btnGhost}>Split sheet</Link> <Link href="/admin/music" className={btnGhost}>Back to music</Link></>}',
}]);

// 5. Artist terms
patch("app/(site)/artist-terms/page.tsx", [
  { label: "date", done: "24 November 2026", from: "Last updated 21 November 2026.", to: "Last updated 24 November 2026." },
  {
    label: "money", done: "set by Fish Guy and shown in your artist dashboard",
    from: "How sales are shared and when you are paid is agreed with you in writing before your music goes on sale. Sales figures in your artist dashboard are before fees and your share.",
    to: "Your share of each sale is set by Fish Guy and shown in your artist dashboard. If a track has collaborators, their percentages come out of the artist share and are recorded on a split sheet, which everyone on it agrees to. A split applies to sales made after it is saved. You can ask for a payout from your dashboard once you reach the minimum amount, and we pay it by bank transfer to the account you save there. Sales figures in your dashboard are before your share is taken out.",
  },
  {
    label: "labels", done: 'title="Labels and managers"',
    from: '      <Section title="Fan details">',
    to: `      <Section title="Labels and managers">
        <p>A label can manage your artist profile only with your consent. When a label adds you, it confirms that you have agreed to be managed by it and to let its team see your plays, sales, fans and earnings. Labels cannot upload music without our checks, and only you can save bank details and ask for payouts. If you did not agree to be on a label, or want to leave one, email us and we will remove the link.</p>
      </Section>
      <Section title="Fan details">`,
  },
]);

console.log(problems ? "\nFinished with notes above. Send me the SKIP lines." : "\nAll done.");
