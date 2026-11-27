import { notFound } from "next/navigation";
import { readStopToken } from "@/lib/optout";
import { stopOffers } from "./actions";

export const metadata = { title: "Stop offers | Fish Guy", robots: { index: false } };

export default async function StopPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const q = await searchParams;
  const phone = readStopToken(decodeURIComponent(token));
  if (!phone) notFound();
  return (
    <main className="page-width utility-page">
      <h1>Stop offers</h1>
      {q.done ? (
        <p className="utility-intro">Done. You will not get offers or reorder reminders from us. You will still get messages about your orders.</p>
      ) : (
        <form action={stopOffers}>
          <p className="utility-intro">Stop offers and reorder reminders to the number ending {phone.slice(-4)}? Messages about your orders will continue.</p>
          <input type="hidden" name="token" value={decodeURIComponent(token)} />
          <button className="button button-gold" type="submit">Stop offers</button>
        </form>
      )}
    </main>
  );
}
