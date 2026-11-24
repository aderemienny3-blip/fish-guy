import { db } from "@/lib/db";
import { getArtistEmail } from "@/lib/artist-auth";
import { getLabelAccess } from "@/lib/label-auth";
import { isLabelActive } from "@/lib/label-rules";

export type ArtistAccess = { email: string; via: "artist" | "label"; artists: { id: string; name: string; slug: string }[] };

/** Who is looking at artist dashboards: an artist (their own profile) or an active label (every artist on its roster). */
export async function getArtistAccess(): Promise<ArtistAccess | null> {
  const select = { id: true, name: true, slug: true } as const;
  const email = await getArtistEmail();
  if (email) return { email, via: "artist", artists: await db.artist.findMany({ where: { email }, orderBy: { name: "asc" }, select }) };

  const label = await getLabelAccess();
  if (label && isLabelActive(label.label)) {
    return { email: label.email, via: "label", artists: await db.artist.findMany({ where: { labelId: label.label.id }, orderBy: { name: "asc" }, select }) };
  }
  return null;
}
