"use server";

import crypto from "node:crypto";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { endLabelSession, getLabelAccess, sendLabelCode, verifyLabelCode } from "@/lib/label-auth";
import { emailInUse } from "@/lib/label-data";
import { confirmLabelPayment } from "@/lib/label-payments";
import { initPaystack, isPaystackCheckoutUrl } from "@/lib/paystack";
import { LABEL_FEE_KOBO, MAX_LABEL_ARTISTS, MAX_LABEL_MEMBERS, cleanEmail, isBusinessEmail, isLabelActive, slugOf } from "@/lib/label-rules";

const enc = encodeURIComponent;
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const here = (q: string) => redirect(`/label?${q}`);

export async function applyLabel(fd: FormData) {
  const name = s(fd, "name");
  const email = cleanEmail(s(fd, "email"));
  const fail = (m: string) => redirect(`/label/apply?error=${enc(m)}`);
  if (name.length < 2 || name.length > 80) fail("Enter your label's name (2 to 80 characters).");
  if (!isBusinessEmail(email)) fail("Use an email on your label's own domain, like you@yourlabel.com. Gmail, Yahoo and other free addresses cannot open a label account.");
  if (fd.get("agree") !== "on") fail("Please confirm that you represent this label.");
  if (await emailInUse(email)) fail("That email is already used on Fish Guy Sounds. Sign in instead, or use a different email.");

  const label = await db.label.create({ data: { name, ownerEmail: email } });
  await db.labelMember.create({ data: { labelId: label.id, email, role: "OWNER" } });
  const r = await sendLabelCode(email);
  if (!r.ok) redirect(`/label/login?error=${enc(r.error ?? "Could not send a code.")}`);
  redirect(`/label/login?sent=1&email=${enc(email)}`);
}

export async function sendCode(fd: FormData) {
  const email = cleanEmail(s(fd, "email"));
  const r = await sendLabelCode(email);
  if (!r.ok) redirect(`/label/login?error=${enc(r.error ?? "Could not send a code.")}`);
  redirect(`/label/login?sent=1&email=${enc(email)}`);
}

export async function checkCode(fd: FormData) {
  const email = cleanEmail(s(fd, "email"));
  if (!(await verifyLabelCode(email, s(fd, "code")))) redirect(`/label/login?sent=1&email=${enc(email)}&error=${enc("That code is wrong or has expired. Ask for a new one.")}`);
  redirect("/label");
}

export async function labelLogout() {
  await endLabelSession();
  redirect("/label/login");
}

/** Only the owner pays. Opens Paystack for the yearly fee. */
export async function startLabelPayment() {
  const a = await getLabelAccess();
  if (!a) redirect("/label/login");
  if (a.role !== "OWNER") here("error=" + enc("Only the label owner can pay."));
  if (a.label.status !== "APPROVED") here("error=" + enc("Your label has not been approved yet."));
  const reference = "FGL-" + crypto.randomBytes(16).toString("hex").toUpperCase();
  let url = "";
  try {
    const init = await initPaystack({ amountKobo: LABEL_FEE_KOBO, reference, email: a.label.ownerEmail, callbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/label?reference=${reference}` });
    if (!isPaystackCheckoutUrl(init.authorizationUrl)) throw new Error("unexpected payment page");
    await db.labelPayment.create({ data: { labelId: a.label.id, reference, amountKobo: LABEL_FEE_KOBO } });
    url = init.authorizationUrl;
  } catch (e) {
    console.error("label payment init failed", e);
    here("error=" + enc("Could not start the payment. Please try again."));
  }
  redirect(url);
}

/** Called when the owner comes back from Paystack. */
export async function checkLabelPayment(fd: FormData) {
  const a = await getLabelAccess();
  if (!a) redirect("/label/login");
  const ref = s(fd, "reference");
  const mine = await db.labelPayment.findFirst({ where: { reference: ref, labelId: a.label.id }, select: { id: true } });
  if (mine) await confirmLabelPayment(ref).catch(() => false);
  here("");
}

export async function addArtist(fd: FormData) {
  const a = await getLabelAccess();
  if (!a) redirect("/label/login");
  if (!isLabelActive(a.label)) here("error=" + enc("Your label account is not active."));
  const name = s(fd, "name");
  const email = cleanEmail(s(fd, "email"));
  const bad = (m: string) => here("error=" + enc(m) + "#add-artist");
  if (name.length < 2 || name.length > 80) bad("Enter the artist's name (2 to 80 characters).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) bad("Enter the artist's own email address.");
  if (fd.get("authorised") !== "on") bad("Please confirm the artist has agreed to be managed by your label.");
  if (await emailInUse(email)) bad("That email is already used by another artist or team on Fish Guy Sounds. Every artist needs their own email.");
  if ((await db.artist.count({ where: { labelId: a.label.id } })) >= MAX_LABEL_ARTISTS) bad("You have reached the artist limit. Contact Fish Guy.");

  const base = slugOf(name) || "artist";
  let slug = base;
  for (let i = 2; await db.artist.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
  await db.artist.create({ data: { name, slug, email, labelId: a.label.id } });
  here("saved=artist#roster");
}

export async function inviteMember(fd: FormData) {
  const a = await getLabelAccess();
  if (!a) redirect("/label/login");
  if (a.role !== "OWNER") here("error=" + enc("Only the label owner can add team members."));
  const email = cleanEmail(s(fd, "email"));
  const bad = (m: string) => here("error=" + enc(m) + "#team");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) bad("Enter a valid email address.");
  if (await emailInUse(email)) bad("That email is already used on Fish Guy Sounds. Each person needs their own email.");
  if ((await db.labelMember.count({ where: { labelId: a.label.id } })) >= MAX_LABEL_MEMBERS) bad(`A label can have up to ${MAX_LABEL_MEMBERS} team members.`);
  await db.labelMember.create({ data: { labelId: a.label.id, email, role: "MANAGER" } });
  here("saved=member#team");
}

export async function removeMember(fd: FormData) {
  const a = await getLabelAccess();
  if (!a) redirect("/label/login");
  if (a.role !== "OWNER") here("error=" + enc("Only the label owner can remove team members."));
  await db.labelMember.deleteMany({ where: { id: s(fd, "id"), labelId: a.label.id, role: { not: "OWNER" } } });
  here("saved=removed#team");
}
