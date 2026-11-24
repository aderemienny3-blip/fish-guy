"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getArtistAccess } from "@/lib/artist-access";
import { MAX_PER_WEEK, MAX_RECIPIENTS, recipientsFor } from "@/lib/announce";

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function submitAnnouncement(fd: FormData) {
  const access = await getArtistAccess();
  if (!access) redirect("/artist/login");
  const artistId = s(fd, "artistId");
  const back = (q: string) => redirect(`/artist?a=${encodeURIComponent(artistId)}&${q}#message-fans`);
  const artist = access.artists.find((a) => a.id === artistId);
  if (!artist) redirect("/artist");

  const audience = s(fd, "audience") === "SUPERFANS" ? "SUPERFANS" : "ALL";
  const subject = s(fd, "subject");
  const body = s(fd, "body");
  const linkUrl = s(fd, "linkUrl");
  if (subject.length < 3 || subject.length > 100) back("error=" + encodeURIComponent("The subject needs 3 to 100 characters."));
  if (body.length < 20 || body.length > 1500) back("error=" + encodeURIComponent("The message needs 20 to 1,500 characters."));
  if (linkUrl && (!/^https:\/\/[^\s]+$/i.test(linkUrl) || linkUrl.length > 300)) back("error=" + encodeURIComponent("The link must start with https://"));

  const week = await db.fanAnnouncement.count({ where: { artistId, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } });
  if (week >= MAX_PER_WEEK) back("error=" + encodeURIComponent(`You can send ${MAX_PER_WEEK} announcements a week. Try again later.`));
  if (await db.fanAnnouncement.count({ where: { artistId, status: "PENDING" } })) back("error=" + encodeURIComponent("You already have one waiting for review."));

  const n = (await recipientsFor(artistId, audience)).length;
  if (n === 0) back("error=" + encodeURIComponent("There is nobody to send this to yet. Fans can be emailed only if they did not keep their email private."));
  if (n > MAX_RECIPIENTS) back("error=" + encodeURIComponent(`That audience is ${n} people, which is over the ${MAX_RECIPIENTS} limit. Choose Superfans only.`));

  await db.fanAnnouncement.create({ data: { artistId, audience, subject, body, linkUrl: linkUrl || null } });
  back("announced=1");
}
