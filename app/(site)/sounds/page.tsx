import Link from 'next/link'
import { ArtistSpotlight } from '@/components/music/artist-spotlight'
import { GenreChips } from '@/components/music/genre-chips'
import { NoTracksEmptyState } from '@/components/music/empty-state'
import { TrackCard } from '@/components/music/track-card'
import { HeroRelease } from '@/components/music/hero-release'
import { TopTen } from '@/components/music/top-ten'
import { getTopTen, hasLibrary } from '@/lib/music/chart'
import { getSessionHash } from '@/lib/music/session'
import { GENRES, getSoundsPageData } from '@/lib/music/data'

export const dynamic = 'force-dynamic'

type SoundsPageProps = { searchParams: Promise<{ genre?: string }> }

export default async function SoundsPage({ searchParams }: SoundsPageProps) {
  const { genre } = await searchParams
  const selectedGenre = GENRES.find((item) => item.toLowerCase() === genre?.toLowerCase())
  const data = await getSoundsPageData(selectedGenre)
  const chart = await getTopTen(data.allTracks)
  const returning = await hasLibrary(await getSessionHash())

  return (
    <main className="page-width sounds-main">
      <section className="hero-grid" aria-labelledby="sounds-title">
        <div className="hero-copy">
          <p className="eyebrow">THE SOUND OF THE STREETS, ON YOUR SPEAKERS</p>
          <h1 id="sounds-title">Lagos has<br />its own <em>sound.</em></h1>
          <p>Fish Guy Sounds puts independent hip-hop up front. Discover new voices, stream what&apos;s free, and buy direct from the artists.</p>
          <div className="hero-actions">
            <a href="#new-releases" className="button button-gold">Explore the releases <span aria-hidden="true">↓</span></a>
            <Link href="/playlists" className="button button-outline">Playlists</Link>
          </div>
          <div className="hero-quiet-links">
            {returning && <Link href="/library">Open my library</Link>}
            <Link href="/shop">Shop frozen food</Link>
          </div>
        </div>
        <HeroRelease track={data.latest} queue={data.allTracks} />
      </section>

      <ArtistSpotlight artist={data.featuredArtist} />

      <section className="genre-area" aria-label="Browse genres">
        <p>Find your frequency</p>
        <GenreChips selected={selectedGenre} />
      </section>

      <section className="section-block" id="new-releases" aria-labelledby="new-releases-title">
        <div className="section-heading">
          <div><p className="eyebrow">FRESH FROM THE STUDIO</p><h2 id="new-releases-title">New releases</h2></div>
          <span className="text-link">{selectedGenre || 'All genres'}</span>
        </div>
        {data.newReleases.length > 0 ? (
          <div className="track-grid">{data.newReleases.map((track) => <TrackCard key={track.id} track={track} queue={data.tracks} />)}</div>
        ) : data.hasPublishedTracks ? (
          <NoTracksEmptyState title={`No ${selectedGenre} tracks yet.`} />
        ) : (
          <NoTracksEmptyState />
        )}
      </section>

      <section className="section-block" id="fish-guy-top-10" aria-labelledby="top-ten-title">
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

      <section className="section-block" aria-labelledby="trending-title">
        <div className="section-heading">
          <div><p className="eyebrow">HEARD AROUND TOWN</p><h2 id="trending-title">Trending now</h2></div>
          <span className="text-link">Last 30 days · real plays</span>
        </div>
        {data.trending.length > 0 ? (
          <div className="track-grid">{data.trending.map((track) => <TrackCard key={track.id} track={track} queue={data.trending} showPlays />)}</div>
        ) : (
          <div className="quiet-empty"><span className="quiet-empty-line" /><p>{data.hasPublishedTracks ? 'No trending tracks yet. Play a release to help it rise.' : 'Trending will appear as artists release music and listeners press play.'}</p></div>
        )}
      </section>
    </main>
  )
}
