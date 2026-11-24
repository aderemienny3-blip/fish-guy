import { db } from "@/lib/db";
import { readUnsubToken } from "@/lib/unsub";
import { confirmUnsubscribe } from "../actions";

export const metadata = { title: "Unsubscribe | Fish Guy Sounds", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Unsubscribe({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  const t = readUnsubToken(decodeURIComponent(token));
  const artist = t ? await db.artist.findUnique({ where: { id: t.artistId }, select: { name: true } }) : null;
  return (
    <main className="page-width utility-page account-page">
      <p className="eyebrow">FISH GUY SOUNDS</p>
      {!t || !artist ? (
        <>
          <h1>This link is not valid</h1>
          <p className="utility-intro">The unsubscribe link is broken or incomplete. Email us and we will remove you.</p>
        </>
      ) : done === "1" ? (
        <>
          <h1>You are unsubscribed</h1>
          <p className="utility-intro">You will not get more emails from {artist.name} through Fish Guy Sounds. Your purchases are not affected.</p>
        </>
      ) : (
        <>
          <h1>Stop emails from {artist.name}?</h1>
          <p className="utility-intro">This stops announcements from {artist.name} to {t.email}. Receipts and your library are not affected.</p>
          <form action={confirmUnsubscribe} className="account-card">
            <input type="hidden" name="token" value={decodeURIComponent(token)} />
            <button className="button button-gold" type="submit">Yes, unsubscribe me</button>
          </form>
        </>
      )}
    </main>
  );
}
