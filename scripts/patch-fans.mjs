// Fan engagement data, superfan exclusives, and fan announcements.
// Needs the artist-dashboard, copyright and sales zips installed first. Safe to re-run.
// Run from the project root:  node scripts/patch-fans.mjs
import fs from "node:fs";

for (const f of ["lib/artist-auth.ts", "lib/copyright.ts", "lib/music/sale-math.ts"]) {
  if (!fs.existsSync(f)) {
    console.log(`Stop: ${f} is missing. Install the artist-dashboard, copyright and sales zips first, then run this again.`);
    process.exit(1);
  }
}

let problems = 0;
function patch(file, steps, optional = false) {
  if (!fs.existsSync(file)) { console.log(`SKIP ${file} (not found)`); problems++; return; }
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let src = raw.replace(/\r\n/g, "\n");
  let changed = false;
  for (const { label, done, from, to, optional: opt } of steps) {
    if (src.includes(done)) { console.log(`ok   ${file}: ${label} (already done)`); continue; }
    if (typeof from === "string" ? !src.includes(from) : !from.test(src)) {
      if (opt) { console.log(`note ${file}: ${label} (not needed)`); continue; }
      console.log(`SKIP ${file}: ${label} (anchor not found)`); problems++; continue;
    }
    src = src.replace(from, to);
    changed = true;
    console.log(`done ${file}: ${label}`);
  }
  if (changed) fs.writeFileSync(file, crlf ? src.replace(/\n/g, "\r\n") : src);
}

// 1. Database
patch("prisma/schema.prisma", [
  { label: "artist link", done: "announcements FanAnnouncement[]", from: "  tracks     Track[]\n}", to: "  tracks     Track[]\n  announcements FanAnnouncement[]\n}" },
  {
    label: "track fields", done: "isSuperfanOnly",
    from: "  @@index([isPublished, releasedAt])",
    to: "  isSuperfanOnly  Boolean          @default(false)\n  listenEvents    ListenEvent[]\n\n  @@index([isPublished, releasedAt])",
  },
  {
    label: "new models", done: "model ListenEvent",
    from: "// ---- FISH GUY STUDENT DISCOUNT ----",
    to: `// ---- LISTEN TRACKING AND FAN ANNOUNCEMENTS ----

model ListenEvent {
  id           String   @id @default(cuid())
  trackId      String
  listenerHash String
  day          String
  startedAt    DateTime @default(now())
  maxSeconds   Int      @default(0)
  completed    Boolean  @default(false)
  isFull       Boolean  @default(false)
  country      String?
  region       String?
  city         String?
  track        Track    @relation(fields: [trackId], references: [id], onDelete: Cascade)

  @@index([trackId, startedAt])
  @@index([listenerHash, trackId, day])
}

model FanAnnouncement {
  id             String    @id @default(cuid())
  artistId       String
  audience       String    @default("ALL") // ALL or SUPERFANS
  subject        String
  body           String
  linkUrl        String?
  status         String    @default("PENDING") // PENDING, SENDING, SENT, REJECTED
  recipientCount Int       @default(0)
  reviewNote     String?
  createdAt      DateTime  @default(now())
  reviewedAt     DateTime?
  sentAt         DateTime?
  artist         Artist    @relation(fields: [artistId], references: [id], onDelete: Cascade)

  @@index([artistId, createdAt])
  @@index([status])
}

model FanUnsubscribe {
  id        String   @id @default(cuid())
  email     String
  artistId  String
  createdAt DateTime @default(now())

  @@unique([email, artistId])
}

// ---- FISH GUY STUDENT DISCOUNT ----`,
  },
]);

// 2. One rule for who hears the full track
patch("app/api/music/stream/[trackId]/route.ts", [
  { label: "import", done: "canHearFull", from: 'import { getSessionHash } from "@/lib/music/session";', to: 'import { getSessionHash } from "@/lib/music/session";\nimport { canHearFull } from "@/lib/music/access";' },
  {
    label: "use the shared rule", done: "const full = await canHearFull",
    from: /  const sessionHash = await getSessionHash\(\);[\s\S]*?const path = released && \(track\.isFreeToStream \|\| owned\) \? track\.mp3Path : track\.previewPath;/,
    to: "  const sessionHash = await getSessionHash();\n  const full = await canHearFull(track, sessionHash);\n  const path = full ? track.mp3Path : track.previewPath;",
  },
]);

// 3. Track data, card and page
patch("lib/music/data.ts", [
  { label: "type", done: "isSuperfanOnly: boolean;", from: "  copyrightLine: string;\n};", to: "  copyrightLine: string;\n  isSuperfanOnly: boolean;\n  artistId: string;\n};" },
  { label: "value", done: "isSuperfanOnly: t.isSuperfanOnly", from: "fallbackYear: (t.releasedAt ?? t.createdAt).getFullYear() }),\n  };", to: "fallbackYear: (t.releasedAt ?? t.createdAt).getFullYear() }),\n    isSuperfanOnly: t.isSuperfanOnly,\n    artistId: t.artistId,\n  };" },
]);
patch("components/music/track-card.tsx", [{
  label: "price label", done: "track.isSuperfanOnly",
  from: "<strong>{track.priceKobo === 0 ? 'Free' : formatNaira(track.priceKobo)}</strong>",
  to: "<strong>{track.isSuperfanOnly ? 'Superfans' : track.priceKobo === 0 ? 'Free' : formatNaira(track.priceKobo)}</strong>",
}]);
patch("app/(site)/sounds/[trackSlug]/page.tsx", [
  { label: "imports", done: "boughtTrackCount", from: "import { formatNaira } from '@/lib/money'", to: "import { formatNaira } from '@/lib/money'\nimport { boughtTrackCount } from '@/lib/music/access'\nimport { getSessionHash } from '@/lib/music/session'\nimport { SUPERFAN_TRACKS } from '@/lib/artist-math'" },
  {
    label: "unlock check", done: "const unlocked =",
    from: "  const sale = await getSaleInfo(track.id)\n",
    to: "  const sale = await getSaleInfo(track.id)\n  const owned = track.isSuperfanOnly ? await boughtTrackCount(await getSessionHash(), track.artistId) : 0\n  const unlocked = track.isSuperfanOnly && owned >= SUPERFAN_TRACKS\n",
  },
  {
    label: "price label", done: "'Superfans only'",
    from: "<p className=\"track-price\">{track.priceKobo === 0 ? 'Free' :",
    to: "<p className=\"track-price\">{track.isSuperfanOnly ? 'Superfans only' : track.priceKobo === 0 ? 'Free' :",
  },
  {
    label: "exclusive message", done: "Superfan exclusive.",
    from: "{track.isFreeToStream && <p className=\"track-description\">This artist has marked the full track free to stream.</p>}",
    to: "{track.isFreeToStream && !track.isSuperfanOnly && <p className=\"track-description\">This artist has marked the full track free to stream.</p>}\n          {track.isSuperfanOnly && <p className=\"track-description\"><strong>Superfan exclusive.</strong> {unlocked ? 'You unlocked this track. Enjoy it.' : `Not for sale. Buy ${SUPERFAN_TRACKS} different tracks by ${track.artistName} to unlock it. You have ${owned} so far. Use the same browser you paid with.`}</p>}",
  },
  {
    label: "play button", done: "canPlay: true }} queue",
    from: "{track.canPlay && <PlayTrackButton track={track} queue={queue} label={track.isFreeToStream ? 'Play full track' : 'Play 30-second preview'} />}",
    to: "{(track.canPlay || unlocked) && <PlayTrackButton track={{ ...track, canPlay: true }} queue={queue} label={unlocked || (track.isFreeToStream && !track.isSuperfanOnly) ? 'Play full track' : 'Play 30-second preview'} />}",
  },
]);

// 4. Upload form and track actions: exclusives need no price or preview
patch("components/admin/TrackUploadForm.tsx", [
  {
    label: "exclusive box", done: 'name="superfanOnly"',
    from: 'name="isFreeToStream" /> Free to stream (full track plays for everyone)</label>',
    to: 'name="isFreeToStream" /> Free to stream (full track plays for everyone)</label>\n        <label className="flex items-start gap-2 pb-2 text-sm md:col-span-2"><input type="checkbox" name="superfanOnly" className="mt-1" /> Superfan exclusive: not for sale. Only fans who bought 3 different tracks by this artist can play it. No price or preview needed.</label>',
  },
  {
    label: "preview check", done: 'fd.get("superfanOnly") !== "on"',
    optional: true,
    from: 'fd.get("isFreeToStream") !== "on" && !preview?.size',
    to: 'fd.get("isFreeToStream") !== "on" && fd.get("superfanOnly") !== "on" && !preview?.size',
  },
]);
patch("app/admin/(panel)/music/actions.ts", [
  { label: "flag", done: 'const superfanOnly =', from: '  const isFree = fd.get("isFreeToStream") === "on";', to: '  const isFree = fd.get("isFreeToStream") === "on";\n  const superfanOnly = fd.get("superfanOnly") === "on";' },
  { label: "preview rule", done: "!isFree && !superfanOnly && !previewPath", from: "!isFree && !previewPath", to: "!isFree && !superfanOnly && !previewPath" },
  { label: "price rule", done: "!isFree && !superfanOnly && priceKobo === 0", from: "!isFree && priceKobo === 0", to: "!isFree && !superfanOnly && priceKobo === 0" },
  { label: "save flag", done: "isSuperfanOnly: superfanOnly", from: "        isFreeToStream: isFree,", to: "        isFreeToStream: isFree && !superfanOnly,\n        isSuperfanOnly: superfanOnly," },
  { label: "publish rule", done: "!t.isSuperfanOnly", from: "!t.isFreeToStream && (!t.previewPath || t.priceKobo <= 0)", to: "!t.isFreeToStream && !t.isSuperfanOnly && (!t.previewPath || t.priceKobo <= 0)" },
]);

// 5. Player: record how long fans really listen
patch("components/music/music-player.tsx", [
  {
    label: "refs", done: "const listenRef",
    from: "  const playedTrackIds = useRef(new Set<string>())\n",
    to: "  const playedTrackIds = useRef(new Set<string>())\n  const listenRef = useRef<{ trackId: string; id: string | null; heard: number; last: number; started: boolean; sent30: boolean } | null>(null)\n  const flushListenRef = useRef<(ended?: boolean) => void>(() => undefined)\n",
  },
  {
    label: "page close", done: "addEventListener('pagehide'",
    from: "  useEffect(() => { currentRef.current = currentTrack }, [currentTrack])\n",
    to: "  useEffect(() => { currentRef.current = currentTrack }, [currentTrack])\n  useEffect(() => {\n    const leave = () => flushListenRef.current()\n    window.addEventListener('pagehide', leave)\n    return () => window.removeEventListener('pagehide', leave)\n  }, [])\n",
  },
  {
    label: "switching tracks", done: "flushListenRef.current()\n    listenRef.current = null",
    from: "    const audio = audioRef.current\n    currentRef.current = track\n    setCurrentTrack(track)",
    to: "    const audio = audioRef.current\n    flushListenRef.current()\n    listenRef.current = null\n    currentRef.current = track\n    setCurrentTrack(track)",
  },
  {
    label: "listen tracking", done: "const trackListen",
    from: "  const onTimeUpdate = () => {\n    const audio = audioRef.current\n    if (!audio || !currentRef.current) return\n    setCurrentTime(audio.currentTime)\n",
    to: `  const postListen = (trackId: string, body: object, beacon = false) => {
    const url = \`/api/music/listens/\${encodeURIComponent(trackId)}\`
    const json = JSON.stringify(body)
    try {
      if (beacon && navigator.sendBeacon && navigator.sendBeacon(url, new Blob([json], { type: 'application/json' }))) return
    } catch { /* fall back to fetch */ }
    void fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: json, keepalive: true }).catch(() => undefined)
  }

  flushListenRef.current = (ended = false) => {
    const l = listenRef.current
    if (!l?.id) return
    postListen(l.trackId, { id: l.id, seconds: Math.floor(l.heard), ended }, true)
  }

  // Counts time actually played (seeking forward does not count), so artists see real listening.
  const trackListen = (t: number) => {
    const track = currentRef.current
    if (!track) return
    let l = listenRef.current
    if (!l || l.trackId !== track.id) { l = { trackId: track.id, id: null, heard: 0, last: t, started: false, sent30: false }; listenRef.current = l }
    const delta = t - l.last
    if (delta > 0 && delta < 1.5) l.heard += delta
    l.last = t
    if (!l.started && l.heard >= 3) {
      l.started = true
      const mine = l
      void fetch(\`/api/music/listens/\${encodeURIComponent(track.id)}\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seconds: Math.floor(mine.heard) }) })
        .then((r) => r.json()).then((j) => { if (j?.id) mine.id = j.id }).catch(() => undefined)
    }
    if (l.id && !l.sent30 && l.heard >= 30) { l.sent30 = true; postListen(track.id, { id: l.id, seconds: Math.floor(l.heard) }) }
  }

  const onTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio || !currentRef.current) return
    setCurrentTime(audio.currentTime)
    trackListen(audio.currentTime)
`,
  },
  {
    label: "track finished", done: "flushListenRef.current(true)",
    from: "  const onEnded = () => {\n    if (!currentRef.current) return\n",
    to: "  const onEnded = () => {\n    if (!currentRef.current) return\n    flushListenRef.current(true)\n",
  },
]);

// 6. Styles and menu
patch("app/(site)/layout.tsx", [{ label: "css", done: "fans.css", from: 'import "./artist-dashboard.css";', to: 'import "./artist-dashboard.css";\nimport "./fans.css";' }]);
patch("app/admin/(panel)/layout.tsx", [{
  label: "admin menu", done: "/admin/music/announcements",
  from: '  { href: "/admin/music/reports", label: "Copyright reports", roles: MGR },',
  to: '  { href: "/admin/music/reports", label: "Copyright reports", roles: MGR },\n  { href: "/admin/music/announcements", label: "Fan announcements", roles: MGR },',
}]);

console.log(problems ? "\nFinished with notes above. Send me the SKIP lines." : "\nAll done.");
