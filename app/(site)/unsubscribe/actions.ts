"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { readUnsubToken } from "@/lib/unsub";

export async function confirmUnsubscribe(fd: FormData) {
  const token = String(fd.get("token") ?? "");
  const t = readUnsubToken(token);
  if (!t) redirect("/");
  await db.fanUnsubscribe.upsert({
    where: { email_artistId: { email: t.email, artistId: t.artistId } },
    update: {},
    create: { email: t.email, artistId: t.artistId },
  });
  redirect(`/unsubscribe/${token}?done=1`);
}
