"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signIn, signOut } from "@/lib/customer-auth";
import { getCustomer } from "@/lib/customer";
import { requestOtp } from "@/lib/otp";
import { normalizeNgPhone } from "@/lib/phone";

const back = (q: string) => redirect(`/account?${q}`);

export async function sendCode(fd: FormData) {
  const raw = String(fd.get("phone") ?? "");
  const phone = normalizeNgPhone(raw);
  if (!phone) back("error=" + encodeURIComponent("Enter a valid Nigerian phone number."));
  let result: Awaited<ReturnType<typeof requestOtp>>;
  try {
    result = await requestOtp(phone!);
  } catch {
    result = { ok: false, error: "We could not send a code right now. Please try again." };
  }
  if (!result.ok) back("error=" + encodeURIComponent(result.error));
  back(`sent=1&phone=${phone}`);
}

export async function verifyCode(fd: FormData) {
  const phone = String(fd.get("phone") ?? "");
  const code = String(fd.get("code") ?? "").trim();
  try {
    await signIn("phone-otp", { phone, code, redirectTo: "/account" });
  } catch (e) {
    if (e instanceof AuthError) back(`sent=1&phone=${encodeURIComponent(phone)}&error=` + encodeURIComponent("That code is wrong or has expired."));
    throw e; // the successful sign-in redirect
  }
}

export async function googleSignIn() {
  await signIn("google", { redirectTo: "/account" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function saveName(fd: FormData) {
  const c = await getCustomer();
  if (!c) redirect("/account");
  const name = String(fd.get("name") ?? "").trim().slice(0, 80);
  await db.customer.update({ where: { id: c.id }, data: { name: name || null } });
  back("saved=1");
}
