// Phone lock screen and notification controls for the music player. No database change. Safe to re-run.
import fs from "node:fs";
const file = "components/music/music-player.tsx";
if (!fs.existsSync(file)) { console.log(`Stop: ${file} is missing. Run this from the project folder.`); process.exit(1); }
const raw = fs.readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
let src = raw.replace(/\r\n/g, "\n");
if (src.includes("controlsRef")) { console.log("ok   already done\n\nAll done."); process.exit(0); }

const start = src.indexOf("  useEffect(() => {\n    if (!currentTrack || !('mediaSession' in navigator)");
const endMark = "  }, [currentTrack, pausePlayback, playNext, playPrevious, resumePlayback, seek])\n";
const end = src.indexOf(endMark);
if (start < 0 || end < start) { console.log("SKIP components/music/music-player.tsx: the old lock screen block was not found. Send me this line."); process.exit(1); }

const next = `  // Lock screen and notification controls (phones, watches, headphones, car screens).
  // The buttons are registered once and always call the latest functions, so they never vanish between renders.
  const controlsRef = useRef<{ play: () => void; pause: () => void; next: () => void; prev: () => void; seek: (s: number) => void }>({ play: () => {}, pause: () => {}, next: () => {}, prev: () => {}, seek: () => {} })
  useEffect(() => {
    controlsRef.current = { play: resumePlayback, pause: pausePlayback, next: playNext, prev: playPrevious, seek }
  }, [pausePlayback, playNext, playPrevious, resumePlayback, seek])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const ms = navigator.mediaSession
    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => { try { ms.setActionHandler(action, handler) } catch { /* this phone does not support that button */ } }
    set('play', () => controlsRef.current.play())
    set('pause', () => controlsRef.current.pause())
    set('stop', () => controlsRef.current.pause())
    set('nexttrack', () => controlsRef.current.next())
    set('previoustrack', () => controlsRef.current.prev())
    set('seekto', (event) => { if (typeof event.seekTime === 'number') controlsRef.current.seek(event.seekTime) })
    set('seekforward', (event) => { const a = audioRef.current; if (a) a.currentTime = Math.min(a.duration || a.currentTime + 10, a.currentTime + (event.seekOffset ?? 10)) })
    set('seekbackward', (event) => { const a = audioRef.current; if (a) a.currentTime = Math.max(0, a.currentTime - (event.seekOffset ?? 10)) })
  }, [])

  // What the lock screen shows: title, artist and cover (the Fish Guy icon when a track has no cover yet).
  useEffect(() => {
    if (!('mediaSession' in navigator) || !('MediaMetadata' in window)) return
    if (!currentTrack) { navigator.mediaSession.metadata = null; return }
    let art = '/icons/icon-512.png'
    try { art = new URL(currentTrack.coverImageUrl ?? art, window.location.origin).href } catch { /* keep the icon */ }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artistName,
      album: 'Fish Guy Sounds',
      artwork: [96, 128, 192, 256, 384, 512].map((n) => ({ src: art, sizes: \`\${n}x\${n}\` })),
    })
  }, [currentTrack])

  // Tells the phone whether to show Play or Pause, and where the song is up to.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = currentTrack ? (isPlaying ? 'playing' : 'paused') : 'none'
  }, [currentTrack, isPlaying])
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack || !Number.isFinite(duration) || duration <= 0) return
    try { navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position: Math.min(Math.max(currentTime, 0), duration) }) } catch { /* not supported here */ }
  }, [currentTrack, currentTime, duration])
`;
src = src.slice(0, start) + next + src.slice(end + endMark.length);
fs.writeFileSync(file, crlf ? src.replace(/\n/g, "\r\n") : src);
console.log("done components/music/music-player.tsx: lock screen controls\n\nAll done.");
