// Download protection and player upgrades.
// Needs the fans zip (and the ones before it) installed first. Safe to re-run.
// Run from the project root:  node scripts/patch-protect.mjs
import fs from "node:fs";

for (const f of ["lib/music/access.ts", "lib/music/sale-math.ts", "app/api/music/listens/[trackId]/route.ts"]) {
  if (!fs.existsSync(f)) {
    console.log(`Stop: ${f} is missing. Install the sales and fans zips first, then run this again.`);
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

// 1. Database
patch("prisma/schema.prisma", [
  { label: "download log", done: "usedAt     DateTime?", from: "  expiresAt   DateTime\n  createdAt   DateTime       @default(now())\n  orderItem   MusicOrderItem", to: "  expiresAt   DateTime\n  createdAt   DateTime       @default(now())\n  usedAt     DateTime?\n  country    String?\n  region     String?\n  orderItem   MusicOrderItem" },
  { label: "reset marker", done: "downloadsFrom", from: "  editionNo     Int?\n", to: "  editionNo     Int?\n  downloadsFrom DateTime?\n" },
]);

// 2. Downloads: limits, single count per link, log, no hotlinking
patch("app/api/music/download-links/route.ts", [
  { label: "import", done: "MAX_DOWNLOADS", from: 'import { getSessionHash, hashToken } from "@/lib/music/session";', to: 'import { getSessionHash, hashToken } from "@/lib/music/session";\nimport { MAX_DOWNLOADS, MAX_LINKS_PER_HOUR } from "@/lib/music/download-limits";' },
  {
    label: "limits", done: "const usedBefore",
    from: '  const token = randomBytes(32).toString("base64url");',
    to: `  const usedBefore = await db.musicDownloadLink.count({
    where: { orderItemId: item.id, format, usedAt: { not: null, gte: item.downloadsFrom ?? new Date(0) } },
  });
  if (usedBefore >= MAX_DOWNLOADS) {
    return NextResponse.json({ error: \`You have used all \${MAX_DOWNLOADS} downloads of this file. Contact Fish Guy and we will reset them.\` }, { status: 403 });
  }
  const recent = await db.musicDownloadLink.count({ where: { orderItemId: item.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
  if (recent >= MAX_LINKS_PER_HOUR) {
    return NextResponse.json({ error: "Too many download attempts. Please try again in an hour." }, { status: 429 });
  }

  const token = randomBytes(32).toString("base64url");`,
  },
  {
    label: "tell the buyer how many are left", done: "remaining: ",
    from: "return NextResponse.json({ url: `/api/music/downloads/${token}`, expiresAt: expiresAt.toISOString() }, { status: 201 });",
    to: "return NextResponse.json({ url: `/api/music/downloads/${token}`, expiresAt: expiresAt.toISOString(), remaining: MAX_DOWNLOADS - usedBefore - 1 }, { status: 201 });",
  },
]);
patch("app/api/music/downloads/[token]/route.ts", [
  { label: "imports", done: "crossSite", from: 'import { getSessionHash, hashToken } from "@/lib/music/session";', to: 'import { getSessionHash, hashToken } from "@/lib/music/session";\nimport { crossSite } from "@/lib/music/guard";\nimport { geoFrom } from "@/lib/geo";' },
  { label: "request name", done: "GET(req: Request", from: "GET(_req: Request,", to: "GET(req: Request," },
  {
    label: "block other sites", done: "Open this link from the Fish Guy website",
    from: "  const { token } = await params;\n",
    to: "  const { token } = await params;\n  if (crossSite(req)) return NextResponse.json({ error: \"Open this link from the Fish Guy website.\" }, { status: 403 });\n",
  },
  {
    label: "log the download", done: "usedAt: new Date()",
    from: "  if (!link || !track || !path) return bad();\n",
    to: "  if (!link || !track || !path) return bad();\n  const where = geoFrom(req.headers);\n  await db.musicDownloadLink.updateMany({ where: { id: link.id, usedAt: null }, data: { usedAt: new Date(), country: where.country, region: where.region } });\n",
  },
]);
patch("app/api/music/stream/[trackId]/route.ts", [
  { label: "import", done: "crossSite", from: 'import { getSessionHash } from "@/lib/music/session";', to: 'import { getSessionHash } from "@/lib/music/session";\nimport { crossSite } from "@/lib/music/guard";' },
  {
    label: "block other sites", done: "if (crossSite(request))",
    from: "  const { trackId } = await params;\n",
    to: "  const { trackId } = await params;\n  if (crossSite(request)) return NextResponse.json({ error: \"Not available.\" }, { status: 403 });\n",
  },
]);
patch("components/music/download-buttons.tsx", [{
  label: "show downloads left", done: "downloads left",
  from: "setMessage(`Link expires ${new Date(result.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`)",
  to: "setMessage(`Link expires ${new Date(result.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.${typeof result.remaining === 'number' ? ` ${result.remaining} downloads left for this file.` : ''}`)",
}]);
patch("app/api/music/listens/[trackId]/route.ts", [
  { label: "report preview or full", done: "full?: boolean", from: "let result: { ok: boolean; id?: string };", to: "let result: { ok: boolean; id?: string; full?: boolean };" },
  { label: "send it back", done: "id: row.id, full: isFull", from: "result = { ok: true, id: row.id };", to: "result = { ok: true, id: row.id, full: isFull };" },
]);

// 3. Library page: say how downloads work
patch("app/(site)/library/page.tsx", [{
  label: "download note", done: "downloads of each file",
  from: "Download links are private, expire after 15 minutes, and can be generated again whenever you need them.",
  to: "Download links are private and expire after 15 minutes. Each purchase includes 5 downloads of each file type. If you need more, contact us.",
}]);

// 4. Player upgrades
patch("components/music/music-player.tsx", [
  { label: "icon", done: "Pause, Play, Repeat,", from: "import { Pause, Play, Shuffle,", to: "import { Pause, Play, Repeat, Shuffle," },
  { label: "types", done: "toggleRepeat: () => void", from: "  isMuted: boolean\n  playTrack:", to: "  isMuted: boolean\n  isBuffering: boolean\n  isPreview: boolean\n  repeatOne: boolean\n  toggleRepeat: () => void\n  playTrack:" },
  { label: "volume key", done: "VOLUME_KEY", from: "const MUTE_PREFERENCE_KEY = 'fish-guy-sounds-muted-v1'\n", to: "const MUTE_PREFERENCE_KEY = 'fish-guy-sounds-muted-v1'\nconst VOLUME_KEY = 'fish-guy-sounds-volume-v1'\n" },
  { label: "state", done: "const [isBuffering", from: "  const [isMuted, setIsMuted] = useState(false)\n", to: "  const [isMuted, setIsMuted] = useState(false)\n  const [isBuffering, setIsBuffering] = useState(false)\n  const [isPreview, setIsPreview] = useState(false)\n  const [repeatOne, setRepeatOne] = useState(false)\n" },
  { label: "reset on new track", done: "setIsPreview(false)", from: "    setCurrentTime(0)\n    setDuration(0)\n    setIsPlaying(true)\n    setNotice('')\n", to: "    setCurrentTime(0)\n    setDuration(0)\n    setIsPlaying(true)\n    setIsPreview(false)\n    setIsBuffering(false)\n    setNotice('')\n" },
  { label: "repeat toggle", done: "const toggleRepeat", from: "  const toggleShuffle = useCallback(() => setIsShuffle((v) => !v), [])\n", to: "  const toggleShuffle = useCallback(() => setIsShuffle((v) => !v), [])\n  const toggleRepeat = useCallback(() => setRepeatOne((v) => !v), [])\n" },
  { label: "remember volume", done: "localStorage.setItem(VOLUME_KEY", from: "    setVolumeState(safeValue)\n", to: "    setVolumeState(safeValue)\n    try { window.localStorage.setItem(VOLUME_KEY, String(safeValue)) } catch { /* storage unavailable */ }\n" },
  {
    label: "load volume", done: "localStorage.getItem(VOLUME_KEY)",
    from: "    try { setIsMuted(window.localStorage.getItem(MUTE_PREFERENCE_KEY) === 'true') } catch { setIsMuted(false) }\n  }, [])",
    to: "    try { setIsMuted(window.localStorage.getItem(MUTE_PREFERENCE_KEY) === 'true') } catch { setIsMuted(false) }\n    try {\n      const saved = Number(window.localStorage.getItem(VOLUME_KEY))\n      if (window.localStorage.getItem(VOLUME_KEY) !== null && Number.isFinite(saved)) setVolumeState(Math.min(1, Math.max(0, saved)))\n    } catch { /* storage unavailable */ }\n  }, [])",
  },
  {
    label: "keyboard shortcuts", done: "const onKey = (e: KeyboardEvent)",
    from: "  const seek = useCallback((value: number) => {\n    if (audioRef.current && Number.isFinite(value)) audioRef.current.currentTime = value\n  }, [])\n",
    to: `  const seek = useCallback((value: number) => {
    if (audioRef.current && Number.isFinite(value)) audioRef.current.currentTime = value
  }, [])

  // Space = play or pause, arrows = skip 10 seconds, N = next, M = mute. Ignored while typing or on a button or link.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!currentRef.current || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(t.tagName))) return
      const audio = audioRef.current
      if (e.key === ' ') { e.preventDefault(); togglePlayback() }
      else if (e.key === 'ArrowRight' && audio) { e.preventDefault(); audio.currentTime = Math.min((audio.duration || audio.currentTime + 10), audio.currentTime + 10) }
      else if (e.key === 'ArrowLeft' && audio) { e.preventDefault(); audio.currentTime = Math.max(0, audio.currentTime - 10) }
      else if (e.key === 'n' || e.key === 'N') playNext()
      else if (e.key === 'm' || e.key === 'M') toggleMute()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePlayback, playNext, toggleMute])
`,
  },
  {
    label: "preview flag", done: "setIsPreview(true)",
    from: "then((j) => { if (j?.id) mine.id = j.id })",
    to: "then((j) => { if (j?.id) mine.id = j.id; if (j && j.full === false && listenRef.current === mine) setIsPreview(true) })",
  },
  {
    label: "repeat this track", done: "if (repeatOne && audioRef.current)",
    from: "    flushListenRef.current(true)\n",
    to: "    flushListenRef.current(true)\n    if (repeatOne && audioRef.current) { listenRef.current = null; audioRef.current.currentTime = 0; void audioRef.current.play().catch(() => setIsPlaying(false)); return }\n",
  },
  {
    label: "context value", done: "isBuffering, isPreview, repeatOne, toggleRepeat,",
    from: "    currentTrack, isPlaying, isShuffle, isStarting, notice, currentTime, duration, volume, isMuted,\n    playTrack, startQueue, playById, togglePlayback, playNext, playPrevious, toggleShuffle, toggleMute, setVolume, seek,\n  }), [currentTrack, isPlaying, isShuffle, isStarting, notice, currentTime, duration, volume, isMuted,\n    playTrack, startQueue, playById, togglePlayback, playNext, playPrevious, toggleShuffle, toggleMute, setVolume, seek])",
    to: "    currentTrack, isPlaying, isShuffle, isStarting, notice, currentTime, duration, volume, isMuted, isBuffering, isPreview, repeatOne, toggleRepeat,\n    playTrack, startQueue, playById, togglePlayback, playNext, playPrevious, toggleShuffle, toggleMute, setVolume, seek,\n  }), [currentTrack, isPlaying, isShuffle, isStarting, notice, currentTime, duration, volume, isMuted, isBuffering, isPreview, repeatOne, toggleRepeat,\n    playTrack, startQueue, playById, togglePlayback, playNext, playPrevious, toggleShuffle, toggleMute, setVolume, seek])",
  },
  { label: "buffering off", done: "setIsBuffering(false); if (currentRef.current) setIsPlaying(true)", from: "onPlaying={() => { errorStreak.current = 0; if (currentRef.current) setIsPlaying(true) }}", to: "onPlaying={() => { errorStreak.current = 0; setIsBuffering(false); if (currentRef.current) setIsPlaying(true) }}" },
  { label: "buffering events", done: "onWaiting=", from: "        onEnded={onEnded}\n", to: "        onEnded={onEnded}\n        onWaiting={() => { if (currentRef.current) setIsBuffering(true) }}\n        onCanPlay={() => setIsBuffering(false)}\n" },
  {
    label: "bar reads new values", done: "isBuffering, isPreview, repeatOne, toggleRepeat, togglePlayback, startQueue",
    from: "const { currentTrack, isPlaying, isShuffle, isStarting, notice, currentTime, duration, volume, isMuted, togglePlayback, startQueue,",
    to: "const { currentTrack, isPlaying, isShuffle, isStarting, notice, currentTime, duration, volume, isMuted, isBuffering, isPreview, repeatOne, toggleRepeat, togglePlayback, startQueue,",
  },
  {
    label: "preview note", done: "player-preview",
    from: "<div className=\"player-track-copy\"><strong>{currentTrack.title}</strong><span>{currentTrack.artistName}</span></div>",
    to: "<div className=\"player-track-copy\"><strong>{currentTrack.title}</strong><span>{currentTrack.artistName}{isBuffering ? ' · Buffering…' : ''}</span>{isPreview && <a className=\"player-preview\" href={`/sounds/${currentTrack.slug}`}>30-second preview · Get the full track</a>}</div>",
  },
  {
    label: "repeat button", done: 'aria-label="Repeat this track"',
    from: "<Shuffle aria-hidden=\"true\" /></button>\n",
    to: "<Shuffle aria-hidden=\"true\" /></button>\n          <button className={`player-icon-button ${repeatOne ? 'is-on' : ''}`} type=\"button\" aria-label=\"Repeat this track\" aria-pressed={repeatOne} onClick={toggleRepeat}><Repeat aria-hidden=\"true\" /></button>\n",
  },
]);

// 5. Styles and menu
patch("app/(site)/layout.tsx", [{ label: "css", done: "protect.css", from: 'import "./fans.css";', to: 'import "./fans.css";\nimport "./protect.css";' }]);
patch("app/admin/(panel)/layout.tsx", [{
  label: "admin menu", done: "/admin/music/downloads",
  from: '  { href: "/admin/music/announcements", label: "Fan announcements", roles: MGR },',
  to: '  { href: "/admin/music/announcements", label: "Fan announcements", roles: MGR },\n  { href: "/admin/music/downloads", label: "Music downloads", roles: MGR },',
}]);

console.log(problems ? "\nFinished with notes above. Send me the SKIP lines." : "\nAll done.");
