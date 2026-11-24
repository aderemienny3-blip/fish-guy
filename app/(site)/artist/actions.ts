"use server";

import { redirect } from "next/navigation";
import { endLabelSession } from "@/lib/label-auth";
import { cleanEmail, endArtistSession, requestArtistCode, verifyArtistCode } from "@/lib/artist-auth";

const enc = encodeURIComponent;

export async function sendArtistCode(fd: FormData) {
  const email = cleanEmail(String(fd.get("email") ?? ""));
  const r = await requestArtistCode(email);
  if (!r.ok) redirect(`/artist/login?error=${enc(r.error ?? "Could not send a code.")}`);
  redirect(`/artist/login?sent=1&email=${enc(email)}`);
}

export async function checkArtistCode(fd: FormData) {
  const email = cleanEmail(String(fd.get("email") ?? ""));
  const ok = await verifyArtistCode(email, String(fd.get("code") ?? ""));
  if (!ok) redirect(`/artist/login?sent=1&email=${enc(email)}&error=${enc("That code is wrong or has expired. Ask for a new one.")}`);
  redirect("/artist");
}

export async function artistLogout() {
  await endArtistSession();
  await endLabelSession();
  redirect("/artist/login");
}
