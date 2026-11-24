'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { ChevronDown, Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { CoverArtwork } from '@/components/music/site-shell'
import { formatDuration } from '@/lib/music/format'
import type { MusicTrack } from '@/lib/music/data'

type Props = {
  track: MusicTrack
  isPlaying: boolean
  isPreview: boolean
  currentTime: number
  duration: number
  onToggle: () => void
  onNext: () => void
  onPrevious: () => void
  onSeek: (seconds: number) => void
  onClose: () => void
}

/** Full-screen player: opens when you tap the cover in the bottom bar. */
export function NowPlaying({ track, isPlaying, isPreview, currentTime, duration, onToggle, onNext, onPrevious, onSeek, onClose }: Props) {
  const max = duration || track.durationSeconds || 0

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = before; window.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div className="now-playing" role="dialog" aria-modal="true" aria-label="Now playing">
      <button type="button" className="now-playing-close" onClick={onClose} aria-label="Close full player"><ChevronDown aria-hidden="true" /></button>
      <div className="now-playing-inner">
        <CoverArtwork src={track.coverImageUrl} alt={`${track.title} cover art`} className={`now-playing-cover ${isPlaying ? 'is-playing' : ''}`} />
        <div className="now-playing-copy">
          <h2>{track.title}</h2>
          <Link href={`/artists/${track.artistSlug}`} onClick={onClose}>{track.artistName}</Link>
          <p>{track.genre}{track.copyrightLine ? ` · ${track.copyrightLine}` : ''}</p>
        </div>
        <div className="now-playing-progress">
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <input aria-label="Track position" type="range" min="0" max={max || 1} step="1" value={Math.min(currentTime, max || 0)} disabled={!duration} onChange={(e) => onSeek(Number(e.target.value))} />
          <span>{formatDuration(Math.floor(max))}</span>
        </div>
        <div className="now-playing-controls">
          <button type="button" aria-label="Previous track" onClick={onPrevious}><SkipBack aria-hidden="true" /></button>
          <button type="button" className="now-playing-main" aria-label={isPlaying ? 'Pause music' : 'Play music'} onClick={onToggle}>
            {isPlaying ? <Pause fill="currentColor" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
          </button>
          <button type="button" aria-label="Next track" onClick={onNext}><SkipForward aria-hidden="true" /></button>
        </div>
        {isPreview && <Link href={`/sounds/${track.slug}`} onClick={onClose} className="now-playing-buy">You are hearing a 30-second preview. Get the full track</Link>}
      </div>
    </div>
  )
}
