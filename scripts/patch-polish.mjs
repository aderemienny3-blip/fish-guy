// Sounds polish: newest release in the hero, idle player bar, calmer buttons, equalizer, full-screen player, Top 10.
// Needs the protect zip installed first. Safe to re-run. No database change.
import fs from "node:fs";
for (const f of ["lib/music/guard.ts", "components/music/music-player.tsx", "app/(site)/sounds/page.tsx"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the earlier zips first (protect, fans), then run this again.`); process.exit(1); }
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

patch("lib/music/data.ts", [{
  label: "all tracks and newest", done: "allTracks: all",
  from: "    hasPublishedTracks: all.length > 0,", to: "    hasPublishedTracks: all.length > 0,\n    allTracks: all,\n    latest: all.find((t) => t.canPlay) ?? null,",
}]);

patch("app/(site)/sounds/page.tsx", [
  { label: "imports", done: "HeroRelease", from: "import { TrackCard } from '@/components/music/track-card'", to: "import { TrackCard } from '@/components/music/track-card'\nimport { HeroRelease } from '@/components/music/hero-release'\nimport { TopTen } from '@/components/music/top-ten'\nimport { getTopTen, hasLibrary } from '@/lib/music/chart'\nimport { getSessionHash } from '@/lib/music/session'" },
  { label: "load chart", done: "const chart = await", from: "  const data = await getSoundsPageData(selectedGenre)\n", to: "  const data = await getSoundsPageData(selectedGenre)\n  const chart = await getTopTen(data.allTracks)\n  const returning = await hasLibrary(await getSessionHash())\n" },
  {
    label: "button hierarchy", done: "hero-quiet-links",
    from: `            <Link href="/playlists" className="button button-outline">Playlists</Link>
            <Link href="/library" className="button button-outline">Open my library</Link>
            <Link href="/shop" className="button button-outline">Shop frozen food</Link>
          </div>`,
    to: `            <Link href="/playlists" className="button button-outline">Playlists</Link>
          </div>
          <div className="hero-quiet-links">
            {returning && <Link href="/library">Open my library</Link>}
            <Link href="/shop">Shop frozen food</Link>
          </div>`,
  },
  {
    label: "newest release card", done: "<HeroRelease",
    from: `        <div className="hero-card" aria-label="Fish Guy Sounds, independent Lagos hip-hop">
          <div className="hero-card-top"><span>FISH GUY SOUNDS</span><span>NG · 01</span></div>
          <div className="waveform" aria-hidden="true">{Array.from({ length: 17 }, (_, index) => <span key={index} />)}</div>
          <div className="hero-card-bottom"><div><strong>Independent by nature.</strong><span>Music moves better when it moves direct.</span></div><span className="hero-card-tag">Lagos, Nigeria</span></div>
        </div>`,
    to: `        <HeroRelease track={data.latest} queue={data.allTracks} />`,
  },
  {
    label: "Top 10 section", done: "fish-guy-top-10",
    from: `      <section className="section-block" aria-labelledby="trending-title">`,
    to: `      <section className="section-block" id="fish-guy-top-10" aria-labelledby="top-ten-title">
        <div className="section-heading">
          <div><p className="eyebrow">THE CHART</p><h2 id="top-ten-title">Fish Guy Top 10</h2></div>
          <span className="text-link">Last 30 days · plays and sales</span>
        </div>
        {chart.length > 0 ? (
          <TopTen rows={chart} />
        ) : (
          <div className="quiet-empty"><span className="quiet-empty-line" /><p>The chart starts the moment listeners press play or buy. Be the first.</p></div>
        )}
      </section>

      <section className="section-block" aria-labelledby="trending-title">`,
  },
]);

patch("components/music/track-card.tsx", [
  { label: "active class", done: "track-card ${active", from: '<article className="track-card">', to: "<article className={`track-card ${active ? 'is-active' : ''}`}>" },
  {
    label: "equalizer", done: "card-eq",
    from: '        <button\n          type="button"\n          className="cover-play"',
    to: '        {active && isPlaying && <span className="card-eq" aria-hidden="true"><i /><i /><i /></span>}\n        <button\n          type="button"\n          className="cover-play"',
  },
]);

patch("components/music/music-player.tsx", [
  { label: "import", done: "NowPlaying }", from: "import { CoverArtwork } from '@/components/music/site-shell'", to: "import { CoverArtwork } from '@/components/music/site-shell'\nimport { NowPlaying } from '@/components/music/now-playing'" },
  { label: "open state", done: "const [fullOpen", from: "  const maxDuration = duration || currentTrack?.durationSeconds || 0\n", to: "  const [fullOpen, setFullOpen] = useState(false)\n  const maxDuration = duration || currentTrack?.durationSeconds || 0\n" },
  { label: "idle class", done: "is-idle", from: '<aside className="mini-player" aria-label="Music player">', to: "<aside className={`mini-player ${currentTrack ? '' : 'is-idle'}`} aria-label=\"Music player\">" },
  {
    label: "tap cover for full player", done: "player-expand",
    from: '            <CoverArtwork src={currentTrack.coverImageUrl} alt={`${currentTrack.title} cover art`} className="player-cover" />',
    to: '            <button type="button" className="player-expand" aria-label="Open full player" onClick={() => setFullOpen(true)}><CoverArtwork src={currentTrack.coverImageUrl} alt={`${currentTrack.title} cover art`} className="player-cover" /></button>',
  },
  {
    label: "full player", done: "<NowPlaying",
    from: "    </aside>\n  )\n}",
    to: "      {fullOpen && currentTrack && (\n        <NowPlaying track={currentTrack} isPlaying={isPlaying} isPreview={isPreview} currentTime={currentTime} duration={duration}\n          onToggle={togglePlayback} onNext={playNext} onPrevious={playPrevious} onSeek={seek} onClose={() => setFullOpen(false)} />\n      )}\n    </aside>\n  )\n}",
  },
]);

patch("app/(site)/layout.tsx", [{ label: "css", done: "polish.css", from: 'import "./protect.css";', to: 'import "./protect.css";\nimport "./polish.css";' }]);
console.log(problems ? "\nFinished with notes above. Send me the SKIP lines." : "\nAll done.");
