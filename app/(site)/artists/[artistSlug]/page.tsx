import Image from 'next/image'
import Link from 'next/link'
import { VerifiedBadge } from '@/components/music/verified-badge'
import { notFound } from 'next/navigation'
import { NoTracksEmptyState } from '@/components/music/empty-state'
import { TrackCard } from '@/components/music/track-card'
import { ArtistPlay } from '@/components/music/artist-play'
import { getArtistBySlug } from '@/lib/music/data'

export default async function ArtistPage({ params }: { params: Promise<{ artistSlug: string }> }) {
  const { artistSlug } = await params
  const data = await getArtistBySlug(artistSlug)
  if (!data) notFound()
  const { artist, tracks } = data
  const cover = artist.bannerUrl || artist.imageUrl
  const playable = tracks.filter((t) => t.canPlay).length

  return (
    <main className="page-width artist-page">
      <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/sounds">Sounds</Link><span aria-hidden="true">/</span><span>{artist.name}</span></nav>

      <section className={`artist-hero ${cover ? 'has-image' : ''}`} aria-labelledby="artist-title">
        {cover && <Image src={cover} alt="" fill priority sizes="100vw" unoptimized aria-hidden="true" />}
        <div className="artist-hero-content">
          {artist.isFeatured && <p className="eyebrow">ARTIST OF THE WEEK</p>}
          <h1 id="artist-title">{artist.name}{artist.verifiedAt && <VerifiedBadge />}</h1>
          <p className="artist-meta">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</p>
        </div>
      </section>

      <div className="artist-actions">
        <ArtistPlay tracks={tracks} />
        {playable === 0 && tracks.length > 0 && <span className="artist-note">Previews are being added.</span>}
      </div>

      <section className="section-block" aria-labelledby="artist-releases-title">
        <div className="section-heading"><div><p className="eyebrow">FROM THE CATALOG</p><h2 id="artist-releases-title">Releases</h2></div></div>
        {tracks.length ? <div className="track-grid">{tracks.map((track) => <TrackCard key={track.id} track={track} queue={tracks} />)}</div> : <NoTracksEmptyState title="No tracks yet." />}
      </section>

      {artist.bio && (
        <section className="artist-about" aria-labelledby="artist-about-title">
          <p className="eyebrow">ABOUT</p>
          <h2 id="artist-about-title">{artist.name}</h2>
          <div className="artist-about-body">
            {artist.bannerUrl && artist.imageUrl && (
              <div className="artist-about-photo"><Image src={artist.imageUrl} alt={artist.name} fill sizes="160px" unoptimized /></div>
            )}
            <p>{artist.bio}</p>
          </div>
        </section>
      )}
    </main>
  )
}

export const dynamic = 'force-dynamic'
