import Link from "next/link";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/customer";
import { naira } from "@/lib/shop/format";
import { ReorderButton, type ReorderLine } from "./reorder-button";
import { ReferralCard } from "@/components/account/referral-card";
import { googleSignIn, logout, saveName, sendCode, verifyCode } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "My account | Fish Guy" };

const LABEL: Record<string, string> = {
  PAID: "Payment confirmed", PREPARING: "Being packed", OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered", CANCELLED: "Cancelled", REFUNDED: "Refunded",
};
const SHOWN = ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED"] as const;
const MAX_QTY = 200;
const when = (d: Date) => new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", year: "numeric" }).format(d);

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; sent?: string; phone?: string; saved?: string }> }) {
  const q = await searchParams;
  const customer = await getCustomer();

  if (!customer) {
    const sent = q.sent === "1" && !!q.phone;
    return (
      <main className="page-width utility-page account-page">
        <p className="eyebrow">YOUR FISH GUY ACCOUNT</p>
        <h1>Sign in to see your orders</h1>
        <p className="utility-intro">Sign in with your phone number to see past orders and reorder in one tap. You do not need an account to buy.</p>
        {q.error && <p className="form-message is-error" role="alert">{q.error}</p>}
        {!sent ? (
          <form action={sendCode} className="account-card">
            <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="080..." required /></label>
            <button className="button button-gold" type="submit">Send me a code</button>
            <p className="account-note">We send a 6-digit code to this number (on WhatsApp where possible).</p>
          </form>
        ) : (
          <form action={verifyCode} className="account-card">
            <input type="hidden" name="phone" value={q.phone} />
            <label>6-digit code sent to {q.phone}<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required /></label>
            <button className="button button-gold" type="submit">Sign in</button>
            <Link href="/account" className="account-note">Use a different number</Link>
          </form>
        )}
        {process.env.AUTH_GOOGLE_ID && (
          <form action={googleSignIn} className="account-card">
            <button className="button button-outline" type="submit">Continue with Google</button>
          </form>
        )}
      </main>
    );
  }

  const where = [{ customerId: customer.id }, ...(customer.phone ? [{ contactPhone: customer.phone }] : []), ...(customer.email ? [{ contactEmail: customer.email }] : [])];
  const orders = await db.order.findMany({
    where: { status: { in: [...SHOWN] }, OR: where },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { items: true },
  });
  const ids = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId)))];
  const products = ids.length ? await db.product.findMany({ where: { id: { in: ids } } }) : [];
  const live = new Map(products.map((p) => [p.id, p]));

  return (
    <main className="page-width utility-page account-page">
      <p className="eyebrow">YOUR FISH GUY ACCOUNT</p>
      <h1>{customer.name ? `Hi, ${customer.name.split(" ")[0]}` : "Your orders"}</h1>
      <p className="utility-intro">{[customer.phone, customer.email].filter(Boolean).join(" · ")}</p>
      {q.saved && <p className="form-message">Saved.</p>}

      <form action={saveName} className="account-card account-name">
        <label>Your name<input name="name" defaultValue={customer.name ?? ""} maxLength={80} autoComplete="name" /></label>
        <button className="button button-outline" type="submit">Save</button>
      </form>

      <ReferralCard customerId={customer.id} />

      <h2 className="account-h2">Past orders</h2>
      {orders.length === 0 ? (
        <p className="account-note">No orders yet. <Link href="/shop">Start shopping</Link>.</p>
      ) : (
        <ul className="account-orders">
          {orders.map((o) => {
            const lines: ReorderLine[] = [];
            const gone: string[] = [];
            for (const it of o.items) {
              const p = live.get(it.productId);
              if (!p || !p.active || p.stockQty <= 0) { gone.push(it.nameSnapshot); continue; }
              lines.push({ productId: p.id, slug: p.slug, name: p.name, priceKobo: p.priceKobo, unit: p.unit, imageUrl: p.imageUrl, qty: Math.min(it.quantity, p.stockQty, MAX_QTY), maxQty: Math.min(p.stockQty, MAX_QTY) });
            }
            return (
              <li key={o.id} className="account-order">
                <div className="account-order-head">
                  <Link href={`/order/${o.reference}`}><strong>{o.reference}</strong></Link>
                  <span>{when(o.createdAt)} · {LABEL[o.status] ?? o.status}</span>
                </div>
                <p className="account-order-items">{o.items.map((i) => `${i.quantity} × ${i.nameSnapshot}`).join(", ")}</p>
                <p className="account-order-total">{naira(o.totalKobo)}</p>
                {gone.length > 0 && <p className="account-note">Not available now: {gone.join(", ")}.</p>}
                <div className="account-order-actions">
                  <ReorderButton lines={lines} />
                  <Link href={`/order/${o.reference}`} className="button button-outline">Track</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="account-note">Reordering uses today&apos;s prices and what is in stock.</p>

      <form action={logout}><button className="button button-outline" type="submit">Sign out</button></form>
    </main>
  );
}
