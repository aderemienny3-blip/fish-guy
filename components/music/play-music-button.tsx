'use client'

import { Pause, Play } from 'lucide-react'
import { useMusicPlayer } from '@/components/music/music-player'

/** A Play button for the header and the home page. Starts the house playlist, or pauses what is playing. */
export function PlayMusicButton({ variant = 'header' }: { variant?: 'header' | 'hero' }) {
  const { currentTrack, isPlaying, isStarting, startQueue, togglePlayback } = useMusicPlayer()
  const label = isPlaying ? 'Pause music' : currentTrack ? 'Resume music' : 'Play music'
  const onClick = () => { if (currentTrack) togglePlayback(); else void startQueue() }

  return (
    <button type="button" className={`play-music play-music-${variant} ${isPlaying ? 'is-playing' : ''}`} onClick={onClick} disabled={isStarting} aria-label={label}>
      {isPlaying ? (
        <span className="eq" aria-hidden="true"><i /><i /><i /></span>
      ) : (
        <Play fill="currentColor" aria-hidden="true" />
      )}
      <span className="play-music-text">{isPlaying ? 'Pause' : isStarting ? 'Loading…' : 'Play music'}</span>
      {isPlaying && <Pause className="play-music-pause" aria-hidden="true" />}
    </button>
  )
}
