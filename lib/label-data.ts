import { db } from "@/lib/db";
import { cleanEmail } from "@/lib/label-rules";

/** One email, one account: an email can be an artist, or a label team member, never two things, and never on two artists. */
export async function emailInUse(raw: string, exceptArtistId?: string) {
  const email = cleanEmail(raw);
  const [artist, member] = await Promise.all([
    db.artist.findFirst({ where: { email: { equals: email, mode: "insensitive" }, ...(exceptArtistId ? { id: { not: exceptArtistId } } : {}) }, select: { id: true } }),
    db.labelMember.findUnique({ where: { email }, select: { id: true } }),
  ]);
  return Boolean(artist || member);
}
