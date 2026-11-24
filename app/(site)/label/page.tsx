import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getLabelAccess } from "@/lib/label-auth";
import { confirmLabelPayment } from "@/lib/label-payments";
import { LABEL_FEE_KOBO, LABEL_PAY_REF, daysLeft, isLabelActive } from "@/lib/label-rules";
import { RosterOverview } from "@/components/artist/roster-overview";
import { VerifiedBadge } from "@/components/music/verified-badge";
import { formatNaira } from "@/lib/money";
import { addArtist, checkLabelPayment, inviteMember, labelLogout, removeMember, startLabelPayment } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Label dashboard | Fish Guy Sounds", robots: { index: false } };

const when = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "long", year: "numeric" }).format(d) : "");

export default async function LabelDashboard({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string; reference?: string }> }) {
  let access = await getLabelAccess();
  if (!access) redirect("/label/login");
  const q = await searchParams;

  // Coming back from Paystack before the webhook arrives.
  if (q.reference && LABEL_PAY_REF.test(q.reference) && access.role === "OWNER") {
    const mine = await db.labelPayment.findFirst({ where: { reference: q.reference, labelId: access.label.id }, select: { id: true } });
    if (mine) { await confirmLabelPayment(q.reference).catch(() => false); access = (await getLabelAccess()) ?? access; }
  }
  const { label, role } = access;
  const owner = role === "OWNER";
  const active = isLabelActive(label);
  const pending = !active ? await db.labelPayment.findFirst({ where: { labelId: label.id, status: "PENDING" }, orderBy: { createdAt: "desc" }, select: { reference: true } }) : null;

  const head = (
    <>
      <p className="eyebrow">LABEL DASHBOARD</p>
      <div className="ad-head">
        <h1>{label.name}</h1>
        <form action={labelLogout}><button className="button button-outline" type="submit">Sign out</button></form>
      </div>
      {q.error && <p className="form-message is-error" role="alert">{q.error}</p>}
    </>
  );

  if (label.status === "UNVERIFIED") {
    return <main className="page-width utility-page artist-dash">{head}<div className="label-note">Confirm your company email to continue. Sign out and sign in again with the code we email you.</div></main>;
  }
  if (label.status === "PENDING") {
    return <main className="page-width utility-page artist-dash">{head}<div className="label-note"><b>Your email is confirmed.</b> Fish Guy is reviewing your label. We will email {label.ownerEmail} when it is approved. You pay only after approval.</div></main>;
  }
  if (label.status === "REJECTED") {
    return <main className="page-width utility-page artist-dash">{head}<div className="label-note"><b>We could not approve this label.</b> {label.rejectNote ?? "Contact Fish Guy if you think this is a mistake."} You have not been charged.</div></main>;
  }

  if (!active) {
    return (
      <main className="page-width utility-page artist-dash">
        {head}
        <div className="label-note">
          <b>{label.paidUntil ? "Your label account has expired." : "Your label is approved."}</b>{" "}
          {label.paidUntil ? `It ended on ${when(label.paidUntil)}. Renew to open your dashboard again. Your artists and data are kept.` : "Pay the yearly fee to open your dashboard and add artists."}
        </div>
        <p className="label-price">{formatNaira(LABEL_FEE_KOBO)} <small style={{ fontSize: 14, color: "#9a9585" }}>for 12 months</small></p>
        {owner ? (
          <>
            <form action={startLabelPayment}><button className="button button-gold" type="submit">Pay with Paystack</button></form>
            {pending && (
              <form action={checkLabelPayment} className="account-note" style={{ marginTop: 14 }}>
                <input type="hidden" name="reference" value={pending.reference} />
                Already paid? <button className="button button-outline" type="submit">Check my payment</button>
              </form>
            )}
          </>
        ) : <p className="account-note">Ask the label owner ({label.ownerEmail}) to pay the fee.</p>}
      </main>
    );
  }

  const [artists, members] = await Promise.all([
    db.artist.findMany({ where: { labelId: label.id }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true, verifiedAt: true } }),
    db.labelMember.findMany({ where: { labelId: label.id }, orderBy: { createdAt: "asc" } }),
  ]);
  const left = daysLeft(label.paidUntil);

  return (
    <main className="page-width utility-page artist-dash">
      {head}
      {q.saved && <p className="form-message" role="status">Saved.</p>}
      <p className="ad-note">Active until {when(label.paidUntil)} ({left} days left).</p>
      {left <= 30 && owner && (
        <div className="label-note"><b>Renew soon.</b> Renewing adds 12 months to the time you have left.
          <form action={startLabelPayment} style={{ marginTop: 10 }}><button className="button button-gold" type="submit">Renew for {formatNaira(LABEL_FEE_KOBO)}</button></form>
        </div>
      )}

      {artists.length > 0 ? <RosterOverview artists={artists} /> : <p className="ad-empty">No artists yet. Add your first one below.</p>}

      <section className="ad-block" id="roster">
        <h2>Artists on your label</h2>
        {artists.length > 0 && (
          <ul className="label-list">
            {artists.map((a) => (
              <li key={a.id}>
                <span>{a.name}{a.verifiedAt && <VerifiedBadge />} <small>{a.email}</small></span>
                <Link className="button button-outline" href={`/artist?a=${a.id}`}>Open dashboard</Link>
              </li>
            ))}
          </ul>
        )}
        <p className="ad-note">Fish Guy uploads and checks each release. A gold verified tag appears beside an artist&apos;s name once we have confirmed who they are. To get an artist verified, ask us.</p>
      </section>

      <section className="ad-block" id="add-artist">
        <h2>Add an artist</h2>
        <form action={addArtist} className="account-card">
          <label>Artist name<input name="name" maxLength={80} required /></label>
          <label>Artist&apos;s own email (each artist needs a different one)<input name="email" type="email" required /></label>
          <label className="label-check"><input type="checkbox" name="authorised" required /> This artist has agreed to be managed by my label and to have their numbers and fans shown to my team.</label>
          <button className="button button-gold" type="submit">Add artist</button>
        </form>
      </section>

      <section className="ad-block" id="team">
        <h2>Your team</h2>
        <ul className="label-list">
          {members.map((m) => (
            <li key={m.id}>
              <span>{m.email} <small>{m.role === "OWNER" ? "Owner" : "Team member"}</small></span>
              {owner && m.role !== "OWNER" && <form action={removeMember}><input type="hidden" name="id" value={m.id} /><button className="button button-outline" type="submit">Remove</button></form>}
            </li>
          ))}
        </ul>
        {owner ? (
          <form action={inviteMember} className="account-card">
            <label>Add a team member&apos;s email (they sign in with a code sent there)<input name="email" type="email" required /></label>
            <button className="button button-outline" type="submit">Add team member</button>
          </form>
        ) : <p className="ad-note">Only the owner can add or remove team members.</p>}
        <p className="ad-note">Team members see the same artists, numbers and fans as you. Only the owner can pay, add team members and remove them.</p>
      </section>
    </main>
  );
}
