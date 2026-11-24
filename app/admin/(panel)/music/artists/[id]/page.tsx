import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import ArtistFields from "@/components/admin/ArtistFields";
import { Banner, PageHeader, btn, btnGhost, card } from "@/components/admin/ui";
import { toggleVerified } from "./verify-actions";
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
      <form action={toggleVerified} className={`${card} mt-6 max-w-2xl space-y-3 p-6`}>
        <input type="hidden" name="id" value={artist.id} />
        <h2 className="text-lg font-medium">Verified artist</h2>
        <p className="text-sm text-[#9A9585]">{artist.verifiedAt ? "This artist shows a gold verified tag beside their name." : "Give the gold verified tag only after you have confirmed who this artist really is (their socials, ID, or distributor)."}</p>
        <button className={artist.verifiedAt ? btnGhost : btn}>{artist.verifiedAt ? "Remove verified tag" : "Verify this artist"}</button>
      </form>
    </>
  );
}
