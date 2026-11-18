// Adds hand-made playlists. Safe to run more than once.
// Run in the project folder:  node scripts/patch-playlists.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

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

// 1) Database
{
  const f = "prisma/schema.prisma";
  let s = readFileSync(f, "utf8");
  let changed = 0;
  if (!s.includes("playlistTracks")) {
    const start = s.indexOf("model Track {");
    if (start === -1) { console.log("CANNOT PATCH prisma/schema.prisma (model Track not found)"); problems++; }
    else { const end = s.indexOf("\n}", start); s = s.slice(0, end) + "\n  playlistTracks  PlaylistTrack[]" + s.slice(end); changed++; }
  }
  if (!s.includes("model Playlist ")) {
    s += `

// ---- FISH GUY PLAYLISTS (hand-made) ----

model Playlist {
  id             String          @id @default(cuid())
  slug           String          @unique
  title          String
  description    String?
  isPublished    Boolean         @default(false)
  isShopPlaylist Boolean         @default(false)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  tracks         PlaylistTrack[]
}

model PlaylistTrack {
  id         String   @id @default(cuid())
  playlistId String
  trackId    String
  position   Int
  createdAt  DateTime @default(now())
  playlist   Playlist @relation(fields: [playlistId], references: [id], onDelete: Cascade)
  track      Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)

  @@unique([playlistId, trackId])
  @@index([playlistId, position])
}
`;
    changed++;
  }
  if (changed) writeFileSync(f, s);
  console.log(`${changed ? "patched " : "ok      "} ${f}`);
}

// 2) A button on the Sounds admin page
patch("app/admin/(panel)/music/page.tsx", [
  { done: "/admin/music/playlists", find: '            <Link href="/admin/music/artists/new" className={btnGhost}>Add artist</Link>', replace: '            <Link href="/admin/music/playlists" className={btnGhost}>Playlists</Link>\n            <Link href="/admin/music/artists/new" className={btnGhost}>Add artist</Link>' },
]);

// 3) Link on the public Sounds page
patch("app/(site)/sounds/page.tsx", [
  { done: 'href="/playlists"', find: '<Link href="/library" className="button button-outline">Open my library</Link>', replace: '<Link href="/playlists" className="button button-outline">Playlists</Link>\n            <Link href="/library" className="button button-outline">Open my library</Link>' },
]);

// 4) Styles
patch("app/(site)/layout.tsx", [
  { done: 'import "./playlists.css"', find: 'import "./site.css";', replace: 'import "./site.css";\nimport "./playlists.css";' },
]);

// 5) Home page: your shop playlist replaces the automatic pick of free tracks
patch("app/(site)/page.tsx", [
  { done: "getShopPlaylistTracks", find: 'import { getShopData } from "@/lib/shop/data";', replace: 'import { getShopData } from "@/lib/shop/data";\nimport { getShopPlaylistTracks } from "@/lib/music/playlists";' },
  {
    done: "const curated",
    find: "  const freeTracks = sounds.tracks.filter((t) => t.isFreeToStream && t.canPlay).slice(0, 3);",
    replace: "  const curated = await getShopPlaylistTracks();\n  const freeTracks = curated.length ? curated.slice(0, 6) : sounds.tracks.filter((t) => t.isFreeToStream && t.canPlay).slice(0, 3);",
  },
]);

if (problems) { console.log(`\n${problems} problem(s). Send me this output and I will fix it.`); process.exit(1); }
console.log("\nAll done.");
