import Link from "next/link";
import { requireAdmin, MANAGERS } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { SEGMENTS, SEGMENT_LABEL, getCustomers, type Segment } from "@/lib/admin/segments";
import { daysSince } from "@/lib/admin/format";
import { formatNaira } from "@/lib/money";
import { db } from "@/lib/db";
import { PAID_STATUSES } from "@/lib/admin/orders";
import { Empty, PageHeader, SegmentBadge, btn, btnGhost, card, input, td, th } from "@/components/admin/ui";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string; q?: string }>;
}) {
  await requireAdmin(MANAGERS);
  const { segment, q } = await searchParams;
  const settings = await getSettings();
  const all = await getCustomers(settings);

  const seg = SEGMENTS.includes(segment as Segment) ? (segment as Segment) : undefined;
  const term = q?.trim().toLowerCase() ?? "";
  const digits = term.replace(/\D/g, "");

  const rows = all.filter(
    (c) =>
      (!seg || c.segment === seg) &&
      (!term ||
        c.name.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        (digits.length >= 4 && c.phone.includes(digits)))
  );

  const counts = new Map<string, number>();
  for (const c of all) counts.set(c.segment, (counts.get(c.segment) ?? 0) + 1);

  const link = (s?: Segment) => {
    const p = new URLSearchParams();
    if (s) p.set("segment", s);
    if (q) p.set("q", q);
    const str = p.toString();
    return str ? `/admin/customers?${str}` : "/admin/customers";
  };
  const exportHref = seg ? `/admin/customers/export?segment=${seg}` : "/admin/customers/export";

  const shown = rows.map((c) => c.phone);
  const [consents, history] = await Promise.all([
    db.messagingConsent.findMany({ where: { phone: { in: shown } }, select: { phone: true, marketing: true } }),
    db.order.findMany({ where: { contactPhone: { in: shown }, status: { in: PAID_STATUSES } }, orderBy: { createdAt: "desc" }, take: 4000, select: { contactPhone: true, zone: { select: { name: true } }, items: { select: { nameSnapshot: true, quantity: true } } } }),
  ]);
  const optedIn = new Map(consents.map((c) => [c.phone, c.marketing]));
  const area = new Map<string, string>();
  const bought = new Map<string, Map<string, number>>();
  for (const o of history) {
    if (!area.has(o.contactPhone)) area.set(o.contactPhone, o.zone.name);
    const m = bought.get(o.contactPhone) ?? new Map<string, number>();
    for (const i of o.items) m.set(i.nameSnapshot, (m.get(i.nameSnapshot) ?? 0) + i.quantity);
    bought.set(o.contactPhone, m);
  }
  const usually = (phone: string) => [...(bought.get(phone) ?? [])].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n).join(", ");

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle={`${all.length} customer${all.length === 1 ? "" : "s"} with at least one paid order.`}
        actions={<a href={exportHref} className={btnGhost}>Download CSV</a>}
      />

      <p className="mb-4 max-w-3xl text-xs text-[#9A9585]">
        Super Buyer: {settings.superBuyerMinOrders}+ orders in the last {settings.superBuyerWindowDays} days
        {settings.superBuyerMinSpendKobo > 0 ? ` or ${formatNaira(settings.superBuyerMinSpendKobo)}+ total spend` : ""}.
        At risk: no order for {settings.atRiskDays}+ days. Lost: {settings.lostDays}+ days. The owner can change these in Settings.
      </p>

      <nav className="mb-4 flex flex-wrap gap-2">
        <Link
          href={link()}
          className={`rounded-full border px-3 py-1 text-sm ${!seg ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5C84C]" : "border-white/15 text-[#9A9585] hover:text-[#F5F1E6]"}`}
        >
          All ({all.length})
        </Link>
        {SEGMENTS.map((s) => (
          <Link
            key={s}
            href={link(s)}
            className={`rounded-full border px-3 py-1 text-sm ${seg === s ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5C84C]" : "border-white/15 text-[#9A9585] hover:text-[#F5F1E6]"}`}
          >
            {SEGMENT_LABEL[s]} ({counts.get(s) ?? 0})
          </Link>
        ))}
      </nav>

      <form method="get" className="mb-4 flex gap-2">
        {seg && <input type="hidden" name="segment" value={seg} />}
        <input name="q" defaultValue={q} placeholder="Search name, phone or email" className={`${input} max-w-xs`} />
        <button type="submit" className={btn}>Search</button>
      </form>

      {all.length === 0 ? (
        <Empty
          title="No customers yet"
          hint="Customers appear here after their first paid order, with their spend, how often they buy and whether they're a Super Buyer."
        />
      ) : rows.length === 0 ? (
        <Empty title="No customers match" hint="Try another segment or search." />
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[1100px]">
            <thead className="border-b border-white/10">
              <tr>
                <th className={th}>Customer</th>
                <th className={th}>Segment</th>
                <th className={`${th} text-right`}>Orders</th>
                <th className={`${th} text-right`}>Total spend</th>
                <th className={`${th} text-right`}>Average</th>
                <th className={th}>Area</th>
                <th className={th}>Usually buys</th>
                <th className={th}>Offers</th>
                <th className={`${th} text-right`}>Last order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((c) => {
                const ago = daysSince(c.lastAt);
                return (
                  <tr key={c.phone} className="hover:bg-white/[0.03]">
                    <td className={td}>
                      <Link href={`/admin/customers/${c.phone}`} className="font-medium hover:text-[#D4AF37]">
                        {c.name || c.phone}
                      </Link>
                      <p className="text-xs text-[#9A9585]">{c.name ? c.phone : c.email}</p>
                    </td>
                    <td className={td}><SegmentBadge segment={c.segment} /></td>
                    <td className={`${td} text-right`}>{c.orders}</td>
                    <td className={`${td} text-right`}>{formatNaira(c.spendKobo)}</td>
                    <td className={`${td} text-right`}>{formatNaira(Math.round(c.spendKobo / c.orders))}</td>
                    <td className={td}>{area.get(c.phone) ?? "-"}</td>
                    <td className={`${td} text-xs`}>{usually(c.phone) || "-"}</td>
                    <td className={td}>{optedIn.get(c.phone) ? <span className="text-[#D4AF37]">Agreed</span> : optedIn.get(c.phone) === false ? <span className="text-red-300">Stopped</span> : <span className="text-[#9A9585]">No</span>}</td>
                    <td className={`${td} text-right text-[#9A9585]`}>{ago === 0 ? "Today" : `${ago}d ago`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
