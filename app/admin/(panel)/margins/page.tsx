import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { PAID_STATUSES } from "@/lib/admin/orders";
import { koboToInput } from "@/lib/admin/format";
import { marginPct, productProfit } from "@/lib/margins";
import { formatNaira } from "@/lib/money";
import { Banner, Empty, PageHeader, btn, card, input, td, th } from "@/components/admin/ui";
import { saveCost } from "./actions";

export const dynamic = "force-dynamic";

export default async function Margins({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [products, lines] = await Promise.all([
    db.product.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], select: { id: true, name: true, unit: true, priceKobo: true, costKobo: true, active: true } }),
    db.orderItem.findMany({ where: { order: { status: { in: PAID_STATUSES }, createdAt: { gte: since } } }, select: { productId: true, unitPriceKobo: true, quantity: true }, take: 20000 }),
  ]);
  const profit = productProfit(lines, new Map(products.map((p) => [p.id, p.costKobo])));
  const missing = products.filter((p) => p.active && p.costKobo === null).length;
  const totalProfit = [...profit.values()].reduce((t, r) => t + (r.profitKobo ?? 0), 0);

  return (
    <>
      <PageHeader title="Cost and margin" subtitle="Enter what each product costs you per unit. Margin and last-30-day gross profit are worked out from your real orders." />
      {q.saved && <Banner kind="ok">Saved.</Banner>}
      {q.error && <Banner>{q.error}</Banner>}
      {missing > 0 && <Banner>{missing} active product{missing === 1 ? " has" : "s have"} no cost yet, so their profit is not counted.</Banner>}
      {products.length === 0 ? <Empty title="No products yet" /> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-white/10"><tr><th className={th}>Product</th><th className={th}>Price</th><th className={th}>Your cost (₦)</th><th className={th}>Margin</th><th className={th}>Sold, 30 days</th><th className={th}>Gross profit, 30 days</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {products.map((p) => {
                const m = marginPct(p.priceKobo, p.costKobo);
                const r = profit.get(p.id);
                return (
                  <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                    <td className={td}>{p.name}<p className="text-xs text-[#9A9585]">per {p.unit}{p.active ? "" : " · hidden"}</p></td>
                    <td className={td}>{formatNaira(p.priceKobo)}</td>
                    <td className={td}>
                      <form action={saveCost} className="flex gap-2">
                        <input type="hidden" name="id" value={p.id} />
                        <input name="cost" defaultValue={p.costKobo === null ? "" : koboToInput(p.costKobo)} inputMode="decimal" placeholder="not set" className={`${input} w-28`} />
                        <button type="submit" className={btn}>Save</button>
                      </form>
                    </td>
                    <td className={`${td} ${m !== null && m < 15 ? "text-orange-300" : ""}`}>{m === null ? "-" : `${m}%`}</td>
                    <td className={td}>{r ? `${r.units}` : "0"}</td>
                    <td className={td}>{r && r.profitKobo !== null ? formatNaira(r.profitKobo) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 max-w-3xl text-sm text-[#9A9585]">Gross profit this month so far: <strong className="text-[#F5F1E6]">{formatNaira(totalProfit)}</strong>. It is price minus your cost, times units, before discounts, delivery and ad spend. Products under 15% margin are highlighted. The cost is today&apos;s cost applied to past orders.</p>
    </>
  );
}
