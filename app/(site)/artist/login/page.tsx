import Link from "next/link";
import { redirect } from "next/navigation";
import { getArtistEmail } from "@/lib/artist-auth";
import { checkArtistCode, sendArtistCode } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Artist sign in | Fish Guy Sounds", robots: { index: false } };

export default async function ArtistLogin({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string; email?: string }> }) {
  if (await getArtistEmail()) redirect("/artist");
  const q = await searchParams;
  const sent = q.sent === "1" && !!q.email;
  return (
    <main className="page-width utility-page account-page">
      <p className="eyebrow">FISH GUY SOUNDS FOR ARTISTS</p>
      <h1>Artist sign in</h1>
      <p className="utility-intro">See your plays, sales and where your listeners are. Sign in with the email Fish Guy has on file for you.</p>
      {q.error && <p className="form-message is-error" role="alert">{q.error}</p>}
      {!sent ? (
        <form action={sendArtistCode} className="account-card">
          <label>Your email<input name="email" type="email" autoComplete="email" required /></label>
          <button className="button button-gold" type="submit">Email me a code</button>
          <p className="account-note">If that email belongs to an artist on Fish Guy Sounds, a 6-digit code is on its way. Not on Sounds yet? <Link href="/sounds/apply">Apply here</Link>.</p>
        </form>
      ) : (
        <form action={checkArtistCode} className="account-card">
          <input type="hidden" name="email" value={q.email} />
          <label>6-digit code sent to {q.email}<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required /></label>
          <button className="button button-gold" type="submit">Sign in</button>
          <Link href="/artist/login" className="account-note">Use a different email</Link>
        </form>
      )}
    </main>
  );
}
