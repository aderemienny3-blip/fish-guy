'use client'

import Link from 'next/link'
import { Pause, Play } from 'lucide-react'
import { useMusicPlayer } from '@/components/music/music-player'
import { CoverArtwork } from '@/components/music/site-shell'
import { VerifiedBadge } from '@/components/music/verified-badge'
import type { MusicTrack } from '@/lib/music/data'

export type ChartRow = { rank: number; track: MusicTrack; plays: number; sales: number }

export function TopTen({ rows }: { rows: ChartRow[] }) {
  const { currentTrack, isPlaying, playTrack, togglePlayback } = useMusicPlayer()
  const queue = rows.map((r) => r.track).filter((t) => t.canPlay)

  return (
    <ol className="top-ten">
      {rows.map(({ rank, track, plays, sales }) => {
        const active = currentTrack?.id === track.id
        return (
          <li key={track.id} className={`top-ten-row ${active ? 'is-active' : ''}`}>
            <span className="top-ten-rank">{rank}</span>
            <CoverArtwork src={track.coverImageUrl} alt="" className="top-ten-cover" />
            <div className="top-ten-copy">
              <Link href={`/sounds/${track.slug}`}>{track.title}</Link>
              <Link href={`/artists/${track.artistSlug}`}>{track.artistName}{track.artistVerified && <VerifiedBadge />}</Link>
            </div>
            <span className="top-ten-stats">{plays.toLocaleString()} plays{sales > 0 ? ` · ${sales} sold` : ''}</span>
            <button type="button" className="top-ten-play" disabled={!track.canPlay}
              aria-label={active && isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              onClick={() => (active ? togglePlayback() : playTrack(track, queue))}>
              {active && isPlaying ? <Pause fill="currentColor" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
