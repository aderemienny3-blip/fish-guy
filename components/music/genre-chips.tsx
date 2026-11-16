import Link from 'next/link'

import { GENRES } from '@/lib/music/data'

export function GenreChips({ selected }: { selected?: string }) {
  return (
    <nav className="genre-chips" aria-label="Filter tracks by genre">
      <Link href="/sounds" className={`genre-chip ${!selected ? 'is-selected' : ''}`} aria-current={!selected ? 'page' : undefined}>All sounds</Link>
      {GENRES.map((genre) => (
        <Link
          href={`/sounds?genre=${encodeURIComponent(genre)}`}
          className={`genre-chip ${selected?.toLowerCase() === genre.toLowerCase() ? 'is-selected' : ''}`}
          aria-current={selected?.toLowerCase() === genre.toLowerCase() ? 'page' : undefined}
          key={genre}
        >
          {genre}
        </Link>
      ))}
    </nav>
  )
}
