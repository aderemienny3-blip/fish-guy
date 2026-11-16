import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import ArtistFields from "@/components/admin/ArtistFields";
import { Banner, PageHeader, card } from "@/components/admin/ui";
import { saveArtist } from "../../actions";

export default async function EditArtist({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin(MANAGERS);
  const { id } = await params;
  const { error } = await searchParams;
  const artist = await db.artist.findUnique({ where: { id } });
  if (!artist) notFound();
  return (
    <>
      <PageHeader title={artist.name} subtitle="Edit artist page" />
      {error && <Banner>{error}</Banner>}
      <form action={saveArtist} className={`${card} max-w-2xl p-6`}><ArtistFields a={artist} /></form>
    </>
  );
}
