'use client'

import Link from 'next/link'
import { Pause, Play } from 'lucide-react'
import { useMusicPlayer } from '@/components/music/music-player'
import { CoverArtwork } from '@/components/music/site-shell'
import { VerifiedBadge } from '@/components/music/verified-badge'
import type { MusicTrack } from '@/lib/music/data'
import { formatNaira } from '@/lib/money'

/** The big card beside the headline: the newest real release, playable. With no music yet it says so honestly. */
export function HeroRelease({ track, queue }: { track: MusicTrack | null; queue: MusicTrack[] }) {
  const { currentTrack, isPlaying, playTrack, togglePlayback } = useMusicPlayer()

  if (!track) {
    return (
      <div className="hero-card" aria-label="Fish Guy Sounds, independent Lagos hip-hop">
        <div className="hero-card-top"><span>FISH GUY SOUNDS</span><span>NG · 01</span></div>
        <div className="waveform" aria-hidden="true">{Array.from({ length: 17 }, (_, index) => <span key={index} />)}</div>
        <div className="hero-card-bottom">
          <div><strong>First releases coming soon.</strong><span>Are you an artist? Put your music here.</span></div>
          <Link href="/sounds/apply" className="hero-card-tag">Apply →</Link>
        </div>
      </div>
    )
  }

  const active = currentTrack?.id === track.id
  const playing = active && isPlaying
  const price = track.isSuperfanOnly ? 'Superfans' : track.priceKobo === 0 ? 'Free' : formatNaira(track.priceKobo)

  return (
    <div className="hero-card hero-release" aria-label={`Newest release: ${track.title} by ${track.artistName}`}>
      <div className="hero-card-top"><span>NEW RELEASE</span><span>{track.genre}</span></div>
      <div className="hero-release-body">
        <Link href={`/sounds/${track.slug}`} className="hero-release-cover" aria-label={`View ${track.title}`}>
          <CoverArtwork src={track.coverImageUrl} alt={`${track.title} cover art`} />
        </Link>
        <div className="hero-release-copy">
          <Link href={`/sounds/${track.slug}`} className="hero-release-title">{track.title}</Link>
          <Link href={`/artists/${track.artistSlug}`} className="hero-release-artist">{track.artistName}{track.artistVerified && <VerifiedBadge />}</Link>
          <div className="hero-release-actions">
            <button type="button" className="hero-release-play" disabled={!track.canPlay}
              onClick={() => (active ? togglePlayback() : playTrack(track, queue))}>
              {playing ? <Pause fill="currentColor" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
              {playing ? 'Pause' : track.isFreeToStream ? 'Play free' : 'Hear a preview'}
            </button>
            <Link href={`/sounds/${track.slug}`} className="hero-release-buy">{price}</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
