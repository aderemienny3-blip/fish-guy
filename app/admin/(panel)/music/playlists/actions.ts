"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, isUniqueError, slugify, str } from "@/lib/admin/format";

const LIST = "/admin/music/playlists";
const edit = (id: string, q = "saved=1") => `${LIST}/${id}?${q}`;

export async function createPlaylist(fd: FormData) {
  await requireAdmin(MANAGERS);
  const title = str(fd, "title");
  if (title.length < 2) bail(LIST, "Give the playlist a name.");
  const base = slugify(title) || "playlist";
  for (let i = 0; i < 20; i++) {
    try {
      const p = await db.playlist.create({ data: { title, slug: i === 0 ? base : `${base}-${i + 1}` } });
      redirect(edit(p.id, "created=1"));
    } catch (e) {
      if (!isUniqueError(e)) throw e;
    }
  }
  bail(LIST, "Could not create that playlist. Try another name.");
}

export async function savePlaylist(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const title = str(fd, "title");
  if (title.length < 2) redirect(edit(id, "error=" + encodeURIComponent("Give the playlist a name.")));
  const isShop = fd.get("isShopPlaylist") === "on";
  const isPublished = fd.get("isPublished") === "on";
  await db.$transaction(async (tx) => {
    if (isShop) await tx.playlist.updateMany({ where: { id: { not: id } }, data: { isShopPlaylist: false } });
    await tx.playlist.update({ where: { id }, data: { title, description: str(fd, "description") || null, isPublished, isShopPlaylist: isShop } });
  });
  redirect(edit(id));
}

export async function addTrack(fd: FormData) {
  await requireAdmin(MANAGERS);
  const playlistId = str(fd, "playlistId");
  const trackId = str(fd, "trackId");
  if (!trackId) redirect(edit(playlistId, "error=" + encodeURIComponent("Choose a track to add.")));
  const last = await db.playlistTrack.findFirst({ where: { playlistId }, orderBy: { position: "desc" }, select: { position: true } });
  try {
    await db.playlistTrack.create({ data: { playlistId, trackId, position: (last?.position ?? 0) + 1 } });
  } catch (e) {
    if (!isUniqueError(e)) throw e; // already in the list
  }
  redirect(edit(playlistId));
}

export async function removeTrack(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const e = await db.playlistTrack.findUnique({ where: { id } });
  if (!e) redirect(LIST);
  await db.playlistTrack.delete({ where: { id } });
  redirect(edit(e.playlistId));
}

export async function moveTrack(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const up = str(fd, "dir") === "up";
  const e = await db.playlistTrack.findUnique({ where: { id } });
  if (!e) redirect(LIST);
  const neighbour = await db.playlistTrack.findFirst({
    where: { playlistId: e.playlistId, position: up ? { lt: e.position } : { gt: e.position } },
    orderBy: { position: up ? "desc" : "asc" },
  });
  if (neighbour) {
    await db.$transaction([
      db.playlistTrack.update({ where: { id: e.id }, data: { position: neighbour.position } }),
      db.playlistTrack.update({ where: { id: neighbour.id }, data: { position: e.position } }),
    ]);
  }
  redirect(edit(e.playlistId, "saved=1"));
}

export async function deletePlaylist(fd: FormData) {
  await requireAdmin(MANAGERS);
  await db.playlist.delete({ where: { id: str(fd, "id") } });
  redirect(`${LIST}?saved=1`);
}
