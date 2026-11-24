// ISRC and file labels (ID3), roster overview for labels, and a better app cache.
// Needs the polish zip installed first. Safe to re-run.
import fs from "node:fs";
for (const f of ["lib/music/guard.ts", "app/(site)/artist/page.tsx", "app/api/music/downloads/[token]/route.ts"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the earlier zips first, then run this again.`); process.exit(1); }
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

// 1. The label-writing library
if (fs.existsSync("package.json")) {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  if (!pkg.dependencies?.["node-id3"]) {
    pkg.dependencies = { ...(pkg.dependencies ?? {}), "node-id3": "^0.2.9" };
    pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
    console.log("done package.json: added node-id3. Run: npm install");
  } else console.log("ok   package.json: node-id3 (already done)");
}

// 2. Database
patch("prisma/schema.prisma", [{
  label: "ISRC", done: "isrc ", from: "model Track {\n  id              String           @id @default(cuid())\n",
  to: "model Track {\n  id              String           @id @default(cuid())\n  isrc            String?          @unique\n",
}]);

// 3. Admin: ISRC on the upload form and on the track settings page
patch("components/admin/TrackUploadForm.tsx", [{
  label: "ISRC box", done: 'name="isrc"',
  from: '        <div><label className={label}>Copyright year</label>',
  to: '        <div><label className={label}>ISRC (optional, like NGABC2400001)</label><input name="isrc" className={input} maxLength={20} /></div>\n        <div><label className={label}>Copyright year</label>',
}]);
patch("app/admin/(panel)/music/actions.ts", [
  { label: "import", done: "normalizeIsrc", from: 'import { bail', to: 'import { normalizeIsrc } from "@/lib/music/isrc";\nimport { bail' },
  {
    label: "check ISRC", done: "const isrc = normalizeIsrc",
    from: '  const copyrightOwner = str(fd, "copyrightOwner").slice(0, 120) || null;\n',
    to: '  const copyrightOwner = str(fd, "copyrightOwner").slice(0, 120) || null;\n  const isrc = normalizeIsrc(str(fd, "isrc"));\n  if (isrc === null) bail(back, "That is not a valid ISRC. It has 12 characters, like NGABC2400001.");\n  if (isrc && (await db.track.findFirst({ where: { isrc }, select: { id: true } }))) bail(back, "That ISRC is already used by another track.");\n',
  },
  { label: "save ISRC", done: "isrc: isrc || null", from: "        copyrightOwner,\n        copyrightYear,\n", to: "        copyrightOwner,\n        copyrightYear,\n        isrc: isrc || null,\n" },
]);
patch("app/admin/(panel)/music/tracks/[id]/sale/page.tsx", [
  { label: "import", done: "saveMetadata", from: 'import { saveSale } from "./actions";', to: 'import { saveSale } from "./actions";\nimport { saveMetadata } from "./metadata-actions";' },
  {
    label: "ISRC form", done: "File labels",
    from: "      </form>\n",
    to: `      </form>

      <form action={saveMetadata} className={\`\${card} mt-6 max-w-2xl space-y-4 p-6\`}>
        <input type="hidden" name="id" value={t.id} />
        <h2 className="text-lg font-medium">File labels</h2>
        <p className="text-sm text-[#9A9585]">These are written into every MP3 a fan downloads, so the song shows its title, artist, cover and copyright in any music app. The ISRC is the recording&apos;s international ID, issued by an ISRC agency or the artist&apos;s distributor. Leave it blank if the artist does not have one yet.</p>
        <div><label className={label}>ISRC (12 characters, like NGABC2400001)</label><input name="isrc" defaultValue={t.isrc ?? ""} maxLength={20} className={input} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className={label}>Copyright owner (blank = the artist)</label><input name="copyrightOwner" defaultValue={t.copyrightOwner ?? ""} maxLength={120} className={input} /></div>
          <div><label className={label}>Copyright year</label><input name="copyrightYear" defaultValue={t.copyrightYear ?? new Date().getFullYear()} inputMode="numeric" className={input} /></div>
        </div>
        <button className={btn}>Save file labels</button>
      </form>
`,
  },
]);

// 4. Downloads: write the labels into the MP3
patch("app/api/music/downloads/[token]/route.ts", [
  { label: "imports", done: "buildTags", from: 'import { geoFrom } from "@/lib/geo";', to: 'import { geoFrom } from "@/lib/geo";\nimport { copyrightLine } from "@/lib/copyright";\nimport { buildTags, tagMp3 } from "@/lib/music/tags";' },
  { label: "load order and artist", done: "order: true, track: { include: { artist: true } }", from: "include: { orderItem: { include: { track: true } } },", to: "include: { orderItem: { include: { order: true, track: { include: { artist: true } } } } }," },
  {
    label: "label the file", done: "const tagged",
    from: "    return new NextResponse(blob.stream, {",
    to: `    let body: BodyInit = blob.stream;
    let length = "";
    if (ext === "mp3") {
      const raw = Buffer.from(await new Response(blob.stream).arrayBuffer());
      let cover: { buffer: Buffer; mime: string } | null = null;
      if (track.coverPath) {
        try {
          const c = await get(track.coverPath, { access: "private" });
          if (c && c.statusCode === 200) {
            const buf = Buffer.from(await new Response(c.stream).arrayBuffer());
            if (buf.length <= 3_000_000) cover = { buffer: buf, mime: c.blob.contentType || "image/jpeg" };
          }
        } catch { /* the song still downloads without a cover */ }
      }
      const year = track.copyrightYear ?? (track.releasedAt ?? track.createdAt).getFullYear();
      const tagged = tagMp3(raw, buildTags({
        title: track.title, artist: track.artist.name, genre: track.genre, isrc: track.isrc, year, cover,
        copyright: copyrightLine({ owner: track.copyrightOwner, year: track.copyrightYear, fallbackOwner: track.artist.name, fallbackYear: year }),
        orderRef: link.orderItem.order.reference,
      }));
      body = new Uint8Array(tagged);
      length = String(tagged.length);
    }
    return new NextResponse(body, {`,
  },
  { label: "length header", done: '...(length ? { "Content-Length": length } : {})', from: '        "Cache-Control": "private, no-store",\n', to: '        "Cache-Control": "private, no-store",\n        ...(length ? { "Content-Length": length } : {}),\n' },
]);

// 5. Roster overview
patch("app/(site)/artist/page.tsx", [
  { label: "import", done: "RosterOverview", from: 'import { artistLogout } from "./actions";', to: 'import { RosterOverview } from "@/components/artist/roster-overview";\nimport { artistLogout } from "./actions";' },
  {
    label: "overview page", done: "q.a === \"all\"",
    from: "  const artist = artists.find((x) => x.id === q.a) ?? artists[0];\n",
    to: `  if (artists.length > 1 && (q.a === "all" || !q.a)) {
    return (
      <main className="page-width utility-page artist-dash">
        <p className="eyebrow">ROSTER</p>
        <div className="ad-head">
          <h1>All your artists</h1>
          <form action={artistLogout}><button className="button button-outline" type="submit">Sign out</button></form>
        </div>
        <nav className="ad-switch" aria-label="Your artist profiles">
          <Link href="/artist?a=all" aria-current="page">All artists</Link>
          {artists.map((x) => <Link key={x.id} href={\`/artist?a=\${x.id}\`}>{x.name}</Link>)}
        </nav>
        <RosterOverview artists={artists} />
      </main>
    );
  }
  const artist = artists.find((x) => x.id === q.a) ?? artists[0];
`,
  },
  {
    label: "All artists link", done: '<Link href="/artist?a=all">All artists</Link>\n          {artists.map((x) => <Link key={x.id} href={`/artist?a=${x.id}`} aria-current',
    from: '        <nav className="ad-switch" aria-label="Your artist profiles">\n          {artists.map((x) => <Link key={x.id} href={`/artist?a=${x.id}`} aria-current={x.id === artist.id ? "page" : undefined}>{x.name}</Link>)}',
    to: '        <nav className="ad-switch" aria-label="Your artist profiles">\n          <Link href="/artist?a=all">All artists</Link>\n          {artists.map((x) => <Link key={x.id} href={`/artist?a=${x.id}`} aria-current={x.id === artist.id ? "page" : undefined}>{x.name}</Link>)}',
  },
]);

// 6. App
patch("app/manifest.ts", [{ label: "Sounds shortcut", done: '"/sounds"', from: '      { name: "My orders", url: "/orders" },', to: '      { name: "My orders", url: "/orders" },\n      { name: "Fish Guy Sounds", url: "/sounds" },' }]);

console.log(problems ? "\nFinished with notes above. Send me the SKIP lines." : "\nAll done. Now run: npm install");
