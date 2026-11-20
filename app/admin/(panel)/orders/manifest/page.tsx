import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { fmtDay } from "@/lib/admin/format";
import { addDays, lagosNow } from "@/lib/delivery";
import { formatNaira } from "@/lib/money";
import { waLink } from "@/lib/admin/whatsapp";
import PrintButton from "@/components/admin/PrintButton";
import { Empty, PageHeader, StatusBadge, btn, btnGhost, card, input } from "@/components/admin/ui";

export default async function ManifestPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const { date: raw } = await searchParams;
  const today = lagosNow().date;
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;

  const orders = await db.order.findMany({
    where: { deliveryDate: date, status: { in: ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] } },
    include: { zone: true, slot: true, items: true },
    orderBy: [{ createdAt: "asc" }],
  });

  // Group: time slot, then zone.
  const groups = new Map<string, { slotStart: number; slot: string; zone: string; orders: typeof orders }>();
  for (const o of orders) {
    const key = `${o.slot.startMinute}|${o.slot.id}|${o.zone.id}`;
    const g = groups.get(key) ?? { slotStart: o.slot.startMinute, slot: o.slot.label, zone: o.zone.name, orders: [] };
    g.orders.push(o);
    groups.set(key, g);
  }
  const sorted = [...groups.values()].sort(
    (a, b) => a.slotStart - b.slotStart || a.zone.localeCompare(b.zone)
  );

  return (
    <>
      <PageHeader
        title="Delivery manifest"
        subtitle={`${fmtDay(date)}: ${orders.length} paid order${orders.length === 1 ? "" : "s"}`}
        actions={<PrintButton>Print manifest</PrintButton>}
      />

      <form method="get" className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
        <Link href={`/admin/orders/manifest?date=${addDays(date, -1)}`} className={btnGhost}>Previous day</Link>
        <input type="date" name="date" defaultValue={date} className={`${input} max-w-[11rem]`} />
        <button type="submit" className={btn}>Show</button>
        <Link href={`/admin/orders/manifest?date=${addDays(date, 1)}`} className={btnGhost}>Next day</Link>
        {date !== today && <Link href="/admin/orders/manifest" className={btnGhost}>Today</Link>}
      </form>

      {sorted.length === 0 ? (
        <Empty title="Nothing to deliver" hint="No paid orders are booked for this day." />
      ) : (
        <div className="space-y-6">
          {sorted.map((g) => (
            <section key={g.slot + g.zone} className={`${card} p-5 print:break-inside-avoid print:border-black print:bg-white`}>
              <h2 className="font-serif text-xl">
                {g.slot} <span className="text-[#9A9585]">·</span> {g.zone}
                <span className="ml-2 text-sm text-[#9A9585]">{g.orders.length} stop{g.orders.length === 1 ? "" : "s"}</span>
              </h2>
              <ul className="mt-3 divide-y divide-white/10 print:divide-black/20">
                {g.orders.map((o) => (
                  <li key={o.id} className="py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/admin/orders/${o.reference}`} className="font-medium text-[#D4AF37] print:text-black">
                        {o.reference}
                      </Link>
                      <span className="print:hidden"><StatusBadge status={o.status} /></span>
                    </div>
                    <p className="mt-1">{o.contactName} · {o.contactPhone}</p>
                    <p>{o.addressLine}{o.landmark ? ` (near ${o.landmark})` : ""}</p>
                    <p className="text-[#9A9585] print:text-black">
                      {o.items.map((i) => `${i.quantity} × ${i.nameSnapshot}`).join(", ")}
                    </p>
                    {o.notes && <p className="italic">Note: {o.notes}</p>}
                    {o.giftName && <p className="font-semibold">GIFT: {o.giftName}</p>}
                    <p className="mt-2 flex flex-wrap gap-2 print:hidden">
                      <a href={`tel:+${o.contactPhone}`} className={btnGhost}>Call</a>
                      <a target="_blank" rel="noreferrer" className={btnGhost} href={waLink(o.contactPhone, `Hello ${o.contactName.split(" ")[0]}, your Fish Guy order ${o.reference} is on its way to you now. Please keep your phone close so our rider can reach you.`)}>WhatsApp: on the way</a>
                      <a target="_blank" rel="noreferrer" className={btnGhost} href={waLink(o.contactPhone, `Hello ${o.contactName.split(" ")[0]}, our Fish Guy rider is at your address with order ${o.reference}. Please come out or call us if you cannot find the rider.`)}>WhatsApp: I'm here</a>
                    </p>
                    <p className="text-[#9A9585] print:text-black">Total {formatNaira(o.totalKobo)}</p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
