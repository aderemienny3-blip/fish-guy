import Link from "next/link";
import { LABEL_FEE_KOBO } from "@/lib/label-rules";
import { formatNaira } from "@/lib/money";
import { applyLabel } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open a label account | Fish Guy Sounds", description: "Manage every artist on your label in one dashboard." };

export default async function LabelApply({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const q = await searchParams;
  return (
    <main className="page-width utility-page account-page">
      <p className="eyebrow">FISH GUY SOUNDS FOR LABELS</p>
      <h1>Open a label account</h1>
      <p className="utility-intro">One dashboard for every artist on your label: plays, sales, fans and where they are. Add your team with their own logins.</p>
      <p className="label-price">{formatNaira(LABEL_FEE_KOBO)} <small style={{ fontSize: 14, color: "#9a9585" }}>a year</small></p>
      <div className="label-note">
        <b>How it works.</b> 1. Confirm your company email. 2. We review your label and approve it. 3. You pay the yearly fee. 4. Add your artists. Each artist needs their own email, and you can get a <b>verified tag</b> for them once Fish Guy has checked them.
      </div>
      {q.error && <p className="form-message is-error" role="alert">{q.error}</p>}
      <form action={applyLabel} className="account-card">
        <label>Label name<input name="name" maxLength={80} required /></label>
        <label>Company email (on your label&apos;s own domain, not Gmail or Yahoo)<input name="email" type="email" autoComplete="email" required /></label>
        <label className="label-check"><input type="checkbox" name="agree" required /> I represent this label and can sign in on its behalf.</label>
        <button className="button button-gold" type="submit">Email me a code</button>
        <p className="account-note">You pay nothing until Fish Guy approves your label. Already have an account? <Link href="/label/login">Sign in</Link>.</p>
      </form>
    </main>
  );
}
