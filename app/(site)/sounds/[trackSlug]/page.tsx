import type { Metadata } from 'next'
import Link from 'next/link'
import { VerifiedBadge } from '@/components/music/verified-badge'
import { notFound } from 'next/navigation'
import { CheckoutForm, PlayTrackButton } from '@/components/music/checkout-form'
import { CoverArtwork } from '@/components/music/site-shell'
import { getSoundsPageData, getTrackBySlug } from '@/lib/music/data'
import { formatNaira } from '@/lib/money'
import { boughtTrackCount } from '@/lib/music/access'
import { getSessionHash } from '@/lib/music/session'
import { SUPERFAN_TRACKS } from '@/lib/artist-math'
import { formatRelease, getSaleInfo } from '@/lib/music/sales'
import { formatDuration } from '@/lib/music/format'

type TrackPageProps = { params: Promise<{ trackSlug: string }> }

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const { trackSlug } = await params
  const track = await getTrackBySlug(trackSlug)
  return track ? { title: `${track.title} by ${track.artistName} | Fish Guy Sounds`, description: `${track.genre} from ${track.artistName} on Fish Guy Sounds.` } : { title: 'Track not found | Fish Guy Sounds' }
}

export default async function TrackPage({ params }: TrackPageProps) {
  const { trackSlug } = await params
  const [track, catalog] = await Promise.all([getTrackBySlug(trackSlug), getSoundsPageData()])
  if (!track) notFound()
  const sale = await getSaleInfo(track.id)
  const owned = track.isSuperfanOnly ? await boughtTrackCount(await getSessionHash(), track.artistId) : 0
  const unlocked = track.isSuperfanOnly && owned >= SUPERFAN_TRACKS
  const queue = catalog.tracks.some((item) => item.id === track.id) ? catalog.tracks : [track, ...catalog.tracks]

  return (
    <main className="page-width track-page">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/sounds">Sounds</Link><span aria-hidden="true">/</span><Link href={`/artists/${track.artistSlug}`}>{track.artistName}</Link><span aria-hidden="true">/</span><span>{track.title}</span></nav>
      <section className="track-detail-grid" aria-labelledby="track-title">
        <CoverArtwork src={track.coverImageUrl} alt={`${track.title} cover art`} className="track-detail-art" />
        <div className="track-info">
          <p className="eyebrow">{track.genre}{track.mood ? ` · ${track.mood}` : ''}</p>
          <h1 id="track-title">{track.title}</h1>
          <Link href={`/artists/${track.artistSlug}`} className="track-artist">{track.artistName}{track.artistVerified && <VerifiedBadge />}</Link>
          <div className="track-facts"><span className="track-fact">{formatDuration(track.durationSeconds)}</span><span className="track-fact">{track.isFreeToStream ? 'Free to stream' : '30-second preview'}</span></div>
          {track.isFreeToStream && !track.isSuperfanOnly && <p className="track-description">This artist has marked the full track free to stream.</p>}
          {track.isSuperfanOnly && <p className="track-description"><strong>Superfan exclusive.</strong> {unlocked ? 'You unlocked this track. Enjoy it.' : `Not for sale. Buy ${SUPERFAN_TRACKS} different tracks by ${track.artistName} to unlock it. You have ${owned} so far. Use the same browser you paid with.`}</p>}
          <p className="track-price">{track.isSuperfanOnly ? 'Superfans only' : track.priceKobo === 0 ? 'Free' : sale?.payWhatYouWant ? `From ${formatNaira(track.priceKobo)}` : formatNaira(track.priceKobo)}</p>
          {sale && !sale.released && sale.releaseAt && <p className="track-description"><strong>Pre-order.</strong> Releases {formatRelease(sale.releaseAt)}. You can hear the 30-second preview now, and the full track unlocks automatically.</p>}
          {sale?.payWhatYouWant && <p className="track-description">Pay what you want. Minimum {formatNaira(track.priceKobo)}.</p>}
          {sale && sale.editionLeft !== null && <p className="track-description"><strong>Limited edition.</strong> {sale.editionLeft > 0 ? `${sale.editionLeft} of ${sale.editionLimit} copies left.` : `All ${sale.editionLimit} copies are sold.`}</p>}
          <div className="track-actions">
            {(track.canPlay || unlocked) && <PlayTrackButton track={{ ...track, canPlay: true }} queue={queue} label={unlocked || (track.isFreeToStream && !track.isSuperfanOnly) ? 'Play full track' : 'Play 30-second preview'} />}
            <Link className="button button-outline" href="/library">My Library</Link>
          </div>
          {track.priceKobo > 0 && <CheckoutForm trackId={track.id} title={track.title} priceKobo={track.priceKobo} payWhatYouWant={Boolean(sale?.payWhatYouWant)} suggestedKobo={sale?.suggestedKobo ?? null} soldOut={sale?.editionLeft === 0} preOrderLabel={sale && !sale.released ? 'preorder' : ''} />}
          {!track.canPlay && <p className="library-note">Audio for this release is not available yet.</p>}
          <p className="library-note">{track.copyrightLine}</p>
          <p className="library-note"><Link href={`/report-track?track=${track.slug}`}>Report this track</Link></p>
        </div>
      </section>
    </main>
  )
}

export const dynamic = 'force-dynamic'
