// Copyright protection: rights confirmation, "Report this track", copyright line on track pages.
// Safe to re-run. Run from the project root:  node scripts/patch-copyright.mjs
import fs from "node:fs";

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

// 1. Database
patch("prisma/schema.prisma", [
  {
    label: "application rights date",
    done: "rightsAcceptedAt",
    from: "  reviewedAt  DateTime?\n  createdAt   DateTime          @default(now())\n}",
    to: "  reviewedAt  DateTime?\n  rightsAcceptedAt DateTime?\n  createdAt   DateTime          @default(now())\n}",
  },
  {
    label: "track rights fields",
    done: "rightsConfirmedAt",
    from: "  orderItems      MusicOrderItem[]\n\n  @@index([isPublished, releasedAt])",
    to: "  orderItems      MusicOrderItem[]\n  rightsConfirmedAt DateTime?\n  rightsConfirmedBy String?\n  copyrightOwner    String?\n  copyrightYear     Int?\n  takedownReports   TakedownReport[]\n\n  @@index([isPublished, releasedAt])",
  },
  {
    label: "TakedownReport model",
    done: "model TakedownReport",
    from: "// ---- FISH GUY STUDENT DISCOUNT ----",
    to: `// ---- COPYRIGHT REPORTS ----

model TakedownReport {
  id            String    @id @default(cuid())
  trackId       String?
  trackRef      String
  reporterName  String
  reporterEmail String
  ownership     String
  description   String
  proofUrl      String?
  signature     String
  status        String    @default("OPEN") // OPEN, ACTIONED, DISMISSED
  adminNote     String?
  handledAt     DateTime?
  createdAt     DateTime  @default(now())
  track         Track?    @relation(fields: [trackId], references: [id], onDelete: SetNull)

  @@index([status, createdAt])
}

// ---- FISH GUY STUDENT DISCOUNT ----`,
  },
]);

// 2. Artist application: required rights box
patch("components/music/artist-application-form.tsx", [{
  label: "rights checkbox",
  done: 'name="rights"',
  from: `      <button className="button button-gold" type="submit" disabled={isPending}>`,
  to: `      <label className="checkout-optin"><input type="checkbox" name="rights" required /> I own this music, or have the right to license it, and any samples are cleared. I have read and agree to the <a href="/artist-terms" target="_blank" rel="noreferrer">Artist terms</a>.</label>
      <button className="button button-gold" type="submit" disabled={isPending}>`,
}]);
patch("app/api/music/applications/route.ts", [
  {
    label: "require rights",
    done: "rightsAcceptedAt",
    from: "  await db.artistApplication.create({ data: { artistName, contactName, email, links, message: message || null } });",
    to: '  if (str(body.rights) !== "on") {\n    return NextResponse.json({ error: "Please confirm you own this music and agree to the Artist terms." }, { status: 400 });\n  }\n  await db.artistApplication.create({ data: { artistName, contactName, email, links, message: message || null, rightsAcceptedAt: new Date() } });',
  },
]);
patch("app/admin/(panel)/music/applications/page.tsx", [{
  label: "show rights status",
  done: "rights confirmed",
  from: "{a.contactName} · {a.email} · {fmtDateTime(a.createdAt)} · {a.status.toLowerCase()}",
  to: '{a.contactName} · {a.email} · {fmtDateTime(a.createdAt)} · {a.status.toLowerCase()} · {a.rightsAcceptedAt ? "rights confirmed " + fmtDateTime(a.rightsAcceptedAt) : "rights not recorded"}',
}]);

// 3. Track upload: rights confirmation + copyright owner and year
patch("components/admin/TrackUploadForm.tsx", [{
  label: "rights fields",
  done: 'name="rightsConfirmed"',
  from: '      <button type="submit" disabled={busy} className={btn}>',
  to: `      <div className="grid gap-4 md:grid-cols-2">
        <div><label className={label}>Copyright owner (blank = the artist)</label><input name="copyrightOwner" className={input} maxLength={120} /></div>
        <div><label className={label}>Copyright year</label><input name="copyrightYear" inputMode="numeric" defaultValue={new Date().getFullYear()} className={input} /></div>
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="rightsConfirmed" required className="mt-1" /> The artist has accepted the Artist terms and confirmed they own, or have licensed, all of this music, including any samples.</label>
      <button type="submit" disabled={busy} className={btn}>`,
}]);
patch("app/admin/(panel)/music/actions.ts", [
  {
    label: "keep the admin who confirms",
    done: "const admin = await requireAdmin(MANAGERS);\n  const back = \"/admin/music/tracks/new\";",
    from: "export async function createTrack(fd: FormData) {\n  await requireAdmin(MANAGERS);",
    to: "export async function createTrack(fd: FormData) {\n  const admin = await requireAdmin(MANAGERS);",
  },
  {
    label: "require rights",
    done: "rightsConfirmed",
    from: '  if (!GENRES.includes(genre)) bail(back, "Choose a genre.");',
    to: '  if (fd.get("rightsConfirmed") !== "on") bail(back, "Confirm the artist owns or has licensed this music before saving.");\n  const yearRaw = Math.round(Number(str(fd, "copyrightYear")));\n  const copyrightYear = yearRaw >= 1900 && yearRaw <= new Date().getFullYear() + 1 ? yearRaw : new Date().getFullYear();\n  const copyrightOwner = str(fd, "copyrightOwner").slice(0, 120) || null;\n  if (!GENRES.includes(genre)) bail(back, "Choose a genre.");',
  },
  {
    label: "save rights record",
    done: "rightsConfirmedAt: new Date()",
    from: '        coverPath: str(fd, "coverPath") || null,\n        slug:',
    to: '        coverPath: str(fd, "coverPath") || null,\n        rightsConfirmedAt: new Date(),\n        rightsConfirmedBy: admin.email,\n        copyrightOwner,\n        copyrightYear,\n        slug:',
  },
]);

// 4. Copyright line on the track page
patch("lib/music/data.ts", [
  { label: "import", done: 'from "@/lib/copyright"', from: 'import { db } from "@/lib/db";', to: 'import { db } from "@/lib/db";\nimport { copyrightLine } from "@/lib/copyright";' },
  { label: "type", done: "copyrightLine: string", from: "  playCount: number;\n};", to: "  playCount: number;\n  copyrightLine: string;\n};" },
  {
    label: "value",
    done: "copyrightLine: copyrightLine(",
    from: "    playCount,\n  };",
    to: "    playCount,\n    copyrightLine: copyrightLine({ owner: t.copyrightOwner, year: t.copyrightYear, fallbackOwner: t.artist.name, fallbackYear: (t.releasedAt ?? t.createdAt).getFullYear() }),\n  };",
  },
]);
patch("app/(site)/sounds/[trackSlug]/page.tsx", [{
  label: "copyright line and report link",
  done: "track.copyrightLine",
  from: "          {!track.canPlay && <p className=\"library-note\">Audio for this release is not available yet.</p>}",
  to: "          {!track.canPlay && <p className=\"library-note\">Audio for this release is not available yet.</p>}\n          <p className=\"library-note\">{track.copyrightLine}</p>\n          <p className=\"library-note\"><Link href={`/report-track?track=${track.slug}`}>Report this track</Link></p>",
}]);

// 5. Links
patch("components/music/site-shell.tsx", [{
  label: "footer link",
  done: 'href="/report-track"',
  from: '<Link href="/sounds/apply">Artist application</Link>',
  to: '<Link href="/sounds/apply">Artist application</Link>\n        <Link href="/report-track">Report a copyright issue</Link>',
}]);
patch("app/admin/(panel)/layout.tsx", [{
  label: "admin menu",
  done: "/admin/music/reports",
  from: '  { href: "/admin/music", label: "Music", roles: MGR },',
  to: '  { href: "/admin/music", label: "Music", roles: MGR },\n  { href: "/admin/music/reports", label: "Copyright reports", roles: MGR },',
}]);

console.log(problems ? "\nFinished with notes above. Send me the SKIP lines." : "\nAll done.");
