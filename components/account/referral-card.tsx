import { db } from "@/lib/db";
import { WhatsAppShare } from "./whatsapp-share";
import { creditBalance, getOrCreateCode, getReferralSettings } from "@/lib/referrals";
import { naira } from "@/lib/shop/format";

const KIND: Record<string, string> = { REFERRAL_REWARD: "Referral reward", SPENT: "Used on an order", RELEASED: "Returned (order did not complete)", MANUAL: "Added by Fish Guy" };
const when = (d: Date) => new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short" }).format(d);

/** On the account page: the customer's code, share link, and credit. Shows nothing until the owner turns referrals on or the customer has credit. */
export async function ReferralCard({ customerId }: { customerId: string }) {
  const [settings, balance] = await Promise.all([getReferralSettings(), creditBalance(db, customerId)]);
  if (!settings.enabled && balance === 0) return null;
  const entries = await db.creditEntry.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: 6 });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const code = settings.enabled ? await getOrCreateCode(customerId) : null;
  const link = code ? `${site}/r/${code}` : "";
  return (
    <section className="account-card">
      <h2 className="account-h2">Credit and referrals</h2>
      <p><strong>Credit: {naira(Math.max(0, balance))}</strong></p>
      <p className="account-note">Credit is used at checkout while you are signed in. You always pay at least ₦200 by card.</p>
      {code && (
        <>
          <p>Your referral code: <strong>{code}</strong></p>
          <p className="account-note">A friend who orders for the first time with your code gets {naira(settings.discountKobo)} off their food. After their order is delivered, you get {naira(settings.rewardKobo)} credit.</p>
          <WhatsAppShare text={`Order frozen fish, turkey and chicken from Fish Guy and get ${naira(settings.discountKobo)} off your first order with my code ${code}: ${link}`} />
        </>
      )}
      {entries.length > 0 && (
        <ul className="account-orders">
          {entries.map((e) => <li key={e.id} className="account-order"><span>{when(e.createdAt)} · {KIND[e.kind] ?? e.kind}</span> <strong>{e.amountKobo > 0 ? "+" : "-"}{naira(Math.abs(e.amountKobo))}</strong></li>)}
        </ul>
      )}
    </section>
  );
}
