"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, str } from "@/lib/admin/format";
import { percentToBps, splitsAreValid } from "@/lib/music/split-math";

export async function addSplit(fd: FormData) {
  await requireAdmin(MANAGERS);
  const trackId = str(fd, "trackId");
  const back = `/admin/music/tracks/${trackId}/splits`;
  const track = await db.track.findUnique({ where: { id: trackId }, select: { artistId: true, splits: { select: { artistId: true, bps: true } } } });
  if (!track) bail("/admin/music", "Track not found.");
  const artistId = str(fd, "artistId");
  if (artistId === track.artistId) bail(back, "The main artist already gets what is left. Add someone else.");
  if (!(await db.artist.findUnique({ where: { id: artistId }, select: { id: true } }))) bail(back, "Choose an artist.");
  const bps = percentToBps(str(fd, "percent"));
  if (bps === null) bail(back, "Enter their percentage, like 20.");
  const others = track.splits.filter((s) => s.artistId !== artistId);
  if (!splitsAreValid([...others, { bps }])) bail(back, "The collaborators together can get at most 99% of the artist share.");
  await db.trackSplit.upsert({
    where: { trackId_artistId: { trackId, artistId } },
    create: { trackId, artistId, bps, role: str(fd, "role").slice(0, 40) || "Collaborator" },
    update: { bps, role: str(fd, "role").slice(0, 40) || "Collaborator" },
  });
  redirect(`${back}?saved=1`);
}

export async function removeSplit(fd: FormData) {
  await requireAdmin(MANAGERS);
  const trackId = str(fd, "trackId");
  await db.trackSplit.deleteMany({ where: { id: str(fd, "id"), trackId } });
  redirect(`/admin/music/tracks/${trackId}/splits?saved=1`);
}
