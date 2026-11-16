import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import TrackUploadForm from "@/components/admin/TrackUploadForm";
import { Banner, Empty, PageHeader, btn, card } from "@/components/admin/ui";
import { GENRES } from "@/lib/music/data";

export default async function NewTrack({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { error } = await searchParams;
  const artists = await db.artist.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <>
      <PageHeader title="Upload track" subtitle="Saved as a draft. Publish it from the music page when you're happy." />
      {error && <Banner>{error}</Banner>}
      {artists.length === 0 ? (
        <Empty title="Add an artist first" action={<Link href="/admin/music/artists/new" className={btn}>Add artist</Link>} />
      ) : (
        <div className={`${card} max-w-2xl p-6`}><TrackUploadForm artists={artists} genres={GENRES} /></div>
      )}
    </>
  );
}
