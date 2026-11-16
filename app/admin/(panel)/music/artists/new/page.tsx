import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import ArtistFields from "@/components/admin/ArtistFields";
import { Banner, PageHeader, card } from "@/components/admin/ui";
import { saveArtist } from "../../actions";

export default async function NewArtist({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { error } = await searchParams;
  return (
    <>
      <PageHeader title="Add artist" />
      {error && <Banner>{error}</Banner>}
      <form action={saveArtist} className={`${card} max-w-2xl p-6`}><ArtistFields /></form>
    </>
  );
}
