"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, isUniqueError, nairaToKobo, slugify, str } from "@/lib/admin/format";
import { GENRES } from "@/lib/music/data";

const RESERVED = new Set(["apply", "return"]);
const httpsOrEmpty = (v: string) => v === "" || /^https:\/\//i.test(v) || /^\/api\/shop\/photo\?p=products%2F[A-Za-z0-9._-]{1,150}$/.test(v);

async function uniqueArtistSlug(base: string) {
  let slug = slugify(base) || "artist";
  for (let i = 2; await db.artist.findUnique({ where: { slug } }); i++) slug = `${slugify(base) || "artist"}-${i}`;
  return slug;
}

export async function approveApplication(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const app = await db.artistApplication.findUnique({ where: { id } });
  if (!app || app.status !== "PENDING") bail("/admin/music/applications", "That application was already handled.");
  const slug = await uniqueArtistSlug(app.artistName);
  await db.$transaction([
    db.artist.create({ data: { slug, name: app.artistName, email: app.email, bio: app.message } }),
    db.artistApplication.update({ where: { id }, data: { status: "APPROVED", reviewedAt: new Date() } }),
  ]);
  redirect("/admin/music/applications?saved=1");
}

export async function rejectApplication(fd: FormData) {
  await requireAdmin(MANAGERS);
  await db.artistApplication.update({
    where: { id: str(fd, "id") },
    data: { status: "REJECTED", reviewedAt: new Date() },
  });
  redirect("/admin/music/applications?saved=1");
}

export async function saveArtist(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const back = id ? `/admin/music/artists/${id}` : "/admin/music/artists/new";
  const name = str(fd, "name");
  const imageUrl = str(fd, "imageUrl");
  const bannerUrl = str(fd, "bannerUrl");
  if (name.length < 2) bail(back, "Enter the artist's name.");
  if (!httpsOrEmpty(imageUrl) || !httpsOrEmpty(bannerUrl)) bail(back, "Image links must start with https://");
  const data = {
    name,
    bio: str(fd, "bio") || null,
    email: str(fd, "email").toLowerCase() || null,
    imageUrl: imageUrl || null,
    bannerUrl: bannerUrl || null,
    isFeatured: fd.get("isFeatured") === "on",
  };
  if (id) await db.artist.update({ where: { id }, data });
  else await db.artist.create({ data: { ...data, slug: await uniqueArtistSlug(name) } });
  // Only one artist is "Artist of the week" at a time.
  if (data.isFeatured) {
    const keep = id || (await db.artist.findFirst({ orderBy: { createdAt: "desc" } }))?.id;
    if (keep) await db.artist.updateMany({ where: { id: { not: keep }, isFeatured: true }, data: { isFeatured: false } });
  }
  redirect("/admin/music?saved=1");
}

export async function createTrack(fd: FormData) {
  await requireAdmin(MANAGERS);
  const back = "/admin/music/tracks/new";
  const artistId = str(fd, "artistId");
  const title = str(fd, "title");
  const genre = str(fd, "genre");
  const priceKobo = nairaToKobo(str(fd, "price") || "0");
  const duration = Math.round(Number(str(fd, "durationSeconds")));
  const isFree = fd.get("isFreeToStream") === "on";
  const mp3Path = str(fd, "mp3Path");
  const previewPath = str(fd, "previewPath");

  if (!(await db.artist.findUnique({ where: { id: artistId } }))) bail(back, "Choose an artist.");
  if (title.length < 1) bail(back, "Enter the track title.");
  if (!GENRES.includes(genre)) bail(back, "Choose a genre.");
  if (priceKobo === null) bail(back, "Enter a valid price in naira (0 for free).");
  if (!Number.isFinite(duration) || duration <= 0) bail(back, "The track length could not be read. Try the MP3 again.");
  if (!mp3Path) bail(back, "Upload the full MP3.");
  if (!isFree && !previewPath) bail(back, "Upload a 30-second preview, or tick 'Free to stream'.");
  if (!isFree && priceKobo === 0) bail(back, "Set a price above zero, or tick 'Free to stream'.");

  let slug = slugify(title) || "track";
  if (RESERVED.has(slug)) slug = `${slug}-track`;
  try {
    await db.track.create({
      data: {
        artistId,
        title,
        genre,
        mood: str(fd, "mood") || null,
        priceKobo,
        durationSeconds: duration,
        isFreeToStream: isFree,
        mp3Path,
        previewPath: previewPath || null,
        wavPath: str(fd, "wavPath") || null,
        coverPath: str(fd, "coverPath") || null,
        slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
        isPublished: false,
      },
    });
  } catch (e) {
    if (isUniqueError(e)) bail(back, "Try saving again.");
    throw e;
  }
  redirect("/admin/music?saved=1");
}

export async function togglePublish(fd: FormData) {
  await requireAdmin(MANAGERS);
  const t = await db.track.findUnique({ where: { id: str(fd, "id") } });
  if (!t) redirect("/admin/music");
  if (!t.isPublished && !t.isFreeToStream && (!t.previewPath || t.priceKobo <= 0)) {
    bail("/admin/music", "A paid track needs a preview file and a price before it can go live.");
  }
  await db.track.update({
    where: { id: t.id },
    data: { isPublished: !t.isPublished, releasedAt: t.isPublished ? t.releasedAt : (t.releasedAt ?? new Date()) },
  });
  redirect("/admin/music?saved=1");
}

export async function setPrice(fd: FormData) {
  await requireAdmin(MANAGERS);
  const kobo = nairaToKobo(str(fd, "price"));
  if (kobo === null) bail("/admin/music", "Enter a valid price in naira.");
  await db.track.update({ where: { id: str(fd, "id") }, data: { priceKobo: kobo } });
  redirect("/admin/music?saved=1");
}
