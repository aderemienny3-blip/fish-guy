import Link from "next/link";
import { redirect } from "next/navigation";
import { getLabelAccess } from "@/lib/label-auth";
import { checkCode, sendCode } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Label sign in | Fish Guy Sounds", robots: { index: false } };

export default async function LabelLogin({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string; email?: string }> }) {
  if (await getLabelAccess()) redirect("/label");
  const q = await searchParams;
  const sent = q.sent === "1" && !!q.email;
  return (
    <main className="page-width utility-page account-page">
      <p className="eyebrow">FISH GUY SOUNDS FOR LABELS</p>
      <h1>Label sign in</h1>
      <p className="utility-intro">Manage your whole roster in one place. Sign in with your label or team email.</p>
      {q.error && <p className="form-message is-error" role="alert">{q.error}</p>}
      {sent && <p className="form-message" role="status">A 6-digit code is on its way to {q.email}.</p>}
      {!sent ? (
        <form action={sendCode} className="account-card">
          <label>Your email<input name="email" type="email" autoComplete="email" required /></label>
          <button className="button button-gold" type="submit">Email me a code</button>
          <p className="account-note">New label? <Link href="/label/apply">Open a label account</Link>. Just an artist? <Link href="/artist/login">Artist sign in</Link>.</p>
        </form>
      ) : (
        <form action={checkCode} className="account-card">
          <input type="hidden" name="email" value={q.email} />
          <label>6-digit code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required /></label>
          <button className="button button-gold" type="submit">Sign in</button>
          <Link href="/label/login" className="account-note">Use a different email</Link>
        </form>
      )}
    </main>
  );
}
