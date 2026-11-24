'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'
import type { MusicTrack } from '@/lib/music/data'
import { formatDuration } from '@/lib/music/format'
import { CoverArtwork } from '@/components/music/site-shell'

type MusicPlayerContextValue = {
  currentTrack: MusicTrack | null
  isPlaying: boolean
  isShuffle: boolean
  isStarting: boolean
  notice: string
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isBuffering: boolean
  isPreview: boolean
  repeatOne: boolean
  toggleRepeat: () => void
  playTrack: (track: MusicTrack, queue: MusicTrack[]) => void
  /** Start the house playlist (your shop playlist, or free tracks). Returns false when there is no music yet. */
  startQueue: () => Promise<boolean>
  /** Play one track by id, e.g. a track an artist is promoting. */
  playById: (id: string) => Promise<boolean>
  togglePlayback: () => void
  playNext: () => void
  playPrevious: () => void
  toggleShuffle: () => void
  toggleMute: () => void
  setVolume: (value: number) => void
  seek: (value: number) => void
}

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null)
const MUTE_PREFERENCE_KEY = 'fish-guy-sounds-muted-v1'
const VOLUME_KEY = 'fish-guy-sounds-volume-v1'
// A one-frame silent clip. Playing it inside the tap unlocks audio on iPhones before the real track has loaded.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

export function MusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const playedTrackIds = useRef(new Set<string>())
  const listenRef = useRef<{ trackId: string; id: string | null; heard: number; last: number; started: boolean; sent30: boolean } | null>(null)
  const flushListenRef = useRef<(ended?: boolean) => void>(() => undefined)
  const currentRef = useRef<MusicTrack | null>(null)
  const errorStreak = useRef(0)
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null)
  const [queue, setQueue] = useState<MusicTrack[]>([])
  const [defaultQueue, setDefaultQueue] = useState<MusicTrack[] | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [notice, setNotice] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.78)
  const [isMuted, setIsMuted] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isPreview, setIsPreview] = useState(false)
  const [repeatOne, setRepeatOne] = useState(false)

  useEffect(() => { currentRef.current = currentTrack }, [currentTrack])
  useEffect(() => {
    const leave = () => flushListenRef.current()
    window.addEventListener('pagehide', leave)
    return () => window.removeEventListener('pagehide', leave)
  }, [])

  const say = useCallback((text: string) => {
    setNotice(text)
    window.setTimeout(() => setNotice((n) => (n === text ? '' : n)), 4500)
  }, [])

  const playTrack = useCallback((track: MusicTrack, nextQueue: MusicTrack[]) => {
    const audio = audioRef.current
    flushListenRef.current()
    listenRef.current = null
    currentRef.current = track
    setCurrentTrack(track)
    setQueue(nextQueue.length ? nextQueue : [track])
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(true)
    setIsPreview(false)
    setIsBuffering(false)
    setNotice('')

    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    audio.src = `/api/music/stream/${encodeURIComponent(track.id)}`
    audio.load()
    void audio.play().catch(() => setIsPlaying(false))
  }, [])

  const prime = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audio.getAttribute('src')) return
    audio.src = SILENT
    void audio.play().catch(() => undefined)
  }, [])

  const unprime = useCallback(() => {
    const audio = audioRef.current
    if (!audio || currentRef.current) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    setIsPlaying(false)
  }, [])

  const loadQueue = useCallback(async (query = ''): Promise<MusicTrack[]> => {
    const res = await fetch(`/api/music/queue${query}`, { cache: 'no-store' })
    const json = (await res.json()) as { tracks?: MusicTrack[] }
    return json.tracks ?? []
  }, [])

  // Warm up the house playlist shortly after the page loads, so the first tap on Play starts instantly.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadQueue().then(setDefaultQueue).catch(() => setDefaultQueue([]))
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [loadQueue])

  const startQueue = useCallback(async () => {
    if (defaultQueue && defaultQueue.length) {
      playTrack(defaultQueue[0], defaultQueue)
      return true
    }
    if (defaultQueue && defaultQueue.length === 0) {
      say('No music is published yet. Check back soon.')
      return false
    }
    prime()
    setIsStarting(true)
    try {
      const tracks = await loadQueue()
      setDefaultQueue(tracks)
      if (!tracks.length) { unprime(); say('No music is published yet. Check back soon.'); return false }
      playTrack(tracks[0], tracks)
      return true
    } catch {
      unprime()
      say('Could not load the music. Check your connection.')
      return false
    } finally {
      setIsStarting(false)
    }
  }, [defaultQueue, loadQueue, playTrack, prime, say, unprime])

  const playById = useCallback(async (id: string) => {
    prime()
    setIsStarting(true)
    try {
      const [track] = await loadQueue(`?id=${encodeURIComponent(id)}`)
      if (!track) { unprime(); say('That track is not available right now.'); return false }
      playTrack(track, defaultQueue && defaultQueue.length ? [track, ...defaultQueue.filter((t) => t.id !== track.id)] : [track])
      return true
    } catch {
      unprime()
      say('Could not load that track.')
      return false
    } finally {
      setIsStarting(false)
    }
  }, [defaultQueue, loadQueue, playTrack, prime, say, unprime])

  const resumePlayback = useCallback(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack || !audio.paused) return
    void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
  }, [currentTrack])

  const pausePlayback = useCallback(() => {
    audioRef.current?.pause()
    setIsPlaying(false)
  }, [])

  const togglePlayback = useCallback(() => {
    if (audioRef.current?.paused) resumePlayback()
    else pausePlayback()
  }, [pausePlayback, resumePlayback])

  const pick = useCallback((direction: 1 | -1) => {
    if (!currentTrack || queue.length < 2) return null
    if (isShuffle && direction === 1) {
      const pool = queue.filter((t) => t.id !== currentTrack.id)
      return pool[Math.floor(Math.random() * pool.length)] ?? null
    }
    const index = queue.findIndex((t) => t.id === currentTrack.id)
    return queue[(index + direction + queue.length) % queue.length] ?? null
  }, [currentTrack, isShuffle, queue])

  const playNext = useCallback(() => {
    const next = pick(1)
    if (next) playTrack(next, queue)
  }, [pick, playTrack, queue])

  const playPrevious = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return }
    const previous = pick(-1)
    if (previous) playTrack(previous, queue)
    else if (audio) audio.currentTime = 0
  }, [pick, playTrack, queue])

  const toggleShuffle = useCallback(() => setIsShuffle((v) => !v), [])
  const toggleRepeat = useCallback(() => setRepeatOne((v) => !v), [])

  const toggleMute = useCallback(() => {
    setIsMuted((previous) => {
      const next = !previous
      try { window.localStorage.setItem(MUTE_PREFERENCE_KEY, String(next)) } catch { /* storage unavailable */ }
      return next
    })
  }, [])

  const setVolume = useCallback((value: number) => {
    const safeValue = Math.min(1, Math.max(0, value))
    setVolumeState(safeValue)
    try { window.localStorage.setItem(VOLUME_KEY, String(safeValue)) } catch { /* storage unavailable */ }
    if (safeValue > 0) {
      setIsMuted(false)
      try { window.localStorage.setItem(MUTE_PREFERENCE_KEY, 'false') } catch { /* storage unavailable */ }
    }
  }, [])

  const seek = useCallback((value: number) => {
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

  useEffect(() => {
    try { setIsMuted(window.localStorage.getItem(MUTE_PREFERENCE_KEY) === 'true') } catch { setIsMuted(false) }
    try {
      const saved = Number(window.localStorage.getItem(VOLUME_KEY))
      if (window.localStorage.getItem(VOLUME_KEY) !== null && Number.isFinite(saved)) setVolumeState(Math.min(1, Math.max(0, saved)))
    } catch { /* storage unavailable */ }
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.volume = volume
    audioRef.current.muted = isMuted
  }, [isMuted, volume])

  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator) || !('MediaMetadata' in window)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artistName,
      album: 'Fish Guy Sounds',
      artwork: currentTrack.coverImageUrl ? [{ src: currentTrack.coverImageUrl, sizes: '512x512', type: 'image/jpeg' }] : [],
    })
    try {
      navigator.mediaSession.setActionHandler('play', () => resumePlayback())
      navigator.mediaSession.setActionHandler('pause', () => pausePlayback())
      navigator.mediaSession.setActionHandler('nexttrack', () => playNext())
      navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious())
      navigator.mediaSession.setActionHandler('seekto', (event) => { if (typeof event.seekTime === 'number') seek(event.seekTime) })
    } catch { return }
    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null)
        navigator.mediaSession.setActionHandler('pause', null)
        navigator.mediaSession.setActionHandler('nexttrack', null)
        navigator.mediaSession.setActionHandler('previoustrack', null)
        navigator.mediaSession.setActionHandler('seekto', null)
      } catch { return }
    }
  }, [currentTrack, pausePlayback, playNext, playPrevious, resumePlayback, seek])

  const recordCurrentPlay = () => {
    if (!currentTrack || playedTrackIds.current.has(currentTrack.id)) return
    playedTrackIds.current.add(currentTrack.id)
    void fetch(`/api/music/plays/${encodeURIComponent(currentTrack.id)}`, { method: 'POST' }).catch(() => undefined)
  }

  const postListen = (trackId: string, body: object, beacon = false) => {
    const url = `/api/music/listens/${encodeURIComponent(trackId)}`
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
      void fetch(`/api/music/listens/${encodeURIComponent(track.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seconds: Math.floor(mine.heard) }) })
        .then((r) => r.json()).then((j) => { if (j?.id) mine.id = j.id; if (j && j.full === false && listenRef.current === mine) setIsPreview(true) }).catch(() => undefined)
    }
    if (l.id && !l.sent30 && l.heard >= 30) { l.sent30 = true; postListen(track.id, { id: l.id, seconds: Math.floor(l.heard) }) }
  }

  const onTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio || !currentRef.current) return
    setCurrentTime(audio.currentTime)
    trackListen(audio.currentTime)
    if (Number.isFinite(audio.duration)) setDuration(audio.duration)
    if (audio.currentTime >= 30) recordCurrentPlay()
  }

  const onEnded = () => {
    if (!currentRef.current) return
    flushListenRef.current(true)
    if (repeatOne && audioRef.current) { listenRef.current = null; audioRef.current.currentTime = 0; void audioRef.current.play().catch(() => setIsPlaying(false)); return }
    if ((audioRef.current?.currentTime ?? 0) >= 30) recordCurrentPlay()
    const next = pick(1)
    if (next) { playTrack(next, queue); return }
    setIsPlaying(false)
  }

  // A track that fails to load is skipped, but never in an endless loop.
  const onError = () => {
    if (!currentRef.current) return
    errorStreak.current += 1
    if (errorStreak.current < Math.max(1, queue.length)) {
      const next = pick(1)
      if (next) { playTrack(next, queue); return }
    }
    errorStreak.current = 0
    setIsPlaying(false)
    say('That track could not be played.')
  }

  const value = useMemo(() => ({
    currentTrack, isPlaying, isShuffle, isStarting, notice, currentTime, duration, volume, isMuted, isBuffering, isPreview, repeatOne, toggleRepeat,
    playTrack, startQueue, playById, togglePlayback, playNext, playPrevious, toggleShuffle, toggleMute, setVolume, seek,
  }), [currentTrack, isPlaying, isShuffle, isStarting, notice, currentTime, duration, volume, isMuted, isBuffering, isPreview, repeatOne, toggleRepeat,
    playTrack, startQueue, playById, togglePlayback, playNext, playPrevious, toggleShuffle, toggleMute, setVolume, seek])

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={() => { if (currentRef.current && audioRef.current && Number.isFinite(audioRef.current.duration)) setDuration(audioRef.current.duration) }}
        onPlaying={() => { errorStreak.current = 0; setIsBuffering(false); if (currentRef.current) setIsPlaying(true) }}
        onPlay={() => { if (currentRef.current) setIsPlaying(true) }}
        onPause={() => { if (currentRef.current) setIsPlaying(false) }}
        onEnded={onEnded}
        onWaiting={() => { if (currentRef.current) setIsBuffering(true) }}
        onCanPlay={() => setIsBuffering(false)}
        onError={onError}
      />
    </MusicPlayerContext.Provider>
  )
}

export function useMusicPlayer() {
  const context = useContext(MusicPlayerContext)
  if (!context) throw new Error('useMusicPlayer must be used inside MusicPlayerProvider.')
  return context
}

/** The player bar is always on screen, so there is always a Play button. */
export function MiniPlayer() {
  const { currentTrack, isPlaying, isShuffle, isStarting, notice, currentTime, duration, volume, isMuted, isBuffering, isPreview, repeatOne, toggleRepeat, togglePlayback, startQueue, playNext, playPrevious, toggleShuffle, toggleMute, setVolume, seek } = useMusicPlayer()
  const maxDuration = duration || currentTrack?.durationSeconds || 0
  const onPlay = () => { if (currentTrack) togglePlayback(); else void startQueue() }

  return (
    <aside className="mini-player" aria-label="Music player">
      <div className="player-track">
        {currentTrack ? (
          <>
            <CoverArtwork src={currentTrack.coverImageUrl} alt={`${currentTrack.title} cover art`} className="player-cover" />
            <div className="player-track-copy"><strong>{currentTrack.title}</strong><span>{currentTrack.artistName}{isBuffering ? ' · Buffering…' : ''}</span>{isPreview && <a className="player-preview" href={`/sounds/${currentTrack.slug}`}>30-second preview · Get the full track</a>}</div>
          </>
        ) : (
          <div className="player-empty" aria-live="polite">
            <strong>Fish Guy Sounds</strong>
            <span>{notice || (isStarting ? 'Loading the music…' : 'Press play for music while you shop')}</span>
          </div>
        )}
      </div>
      <div className="player-center">
        <div className="player-controls">
          <button className={`player-icon-button ${isShuffle ? 'is-on' : ''}`} type="button" aria-label="Shuffle" aria-pressed={isShuffle} onClick={toggleShuffle}><Shuffle aria-hidden="true" /></button>
          <button className={`player-icon-button ${repeatOne ? 'is-on' : ''}`} type="button" aria-label="Repeat this track" aria-pressed={repeatOne} onClick={toggleRepeat}><Repeat aria-hidden="true" /></button>
          <button className="player-icon-button" type="button" aria-label="Previous track" disabled={!currentTrack} onClick={playPrevious}><SkipBack aria-hidden="true" /></button>
          <button className="player-icon-button player-play-button" type="button" aria-label={isPlaying ? 'Pause music' : 'Play music'} disabled={isStarting} onClick={onPlay}>
            {isPlaying ? <Pause fill="currentColor" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
          </button>
          <button className="player-icon-button" type="button" aria-label="Next track" disabled={!currentTrack} onClick={playNext}><SkipForward aria-hidden="true" /></button>
        </div>
        <div className="player-progress">
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <input aria-label="Track position" type="range" min="0" max={maxDuration || 1} step="1" value={Math.min(currentTime, maxDuration || 0)} disabled={!currentTrack || !duration} onChange={(event) => seek(Number(event.target.value))} />
          <span>{formatDuration(Math.floor(maxDuration))}</span>
        </div>
      </div>
      <div className="player-volume">
        <button className="player-icon-button" type="button" aria-label={isMuted ? 'Unmute music' : 'Mute music'} onClick={toggleMute}>
          {isMuted || volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </button>
        <input aria-label="Volume" type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={(event) => setVolume(Number(event.target.value))} />
      </div>
    </aside>
  )
}
