import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { formatNaira } from "@/lib/money";
import { Banner, Empty, PageHeader, btn, btnGhost, card, input, td, th } from "@/components/admin/ui";
import { setStock, toggleProduct } from "./actions";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; saved?: string; error?: string }>;
}) {
  await requireAdmin(MANAGERS);
  const { show, saved, error } = await searchParams;
  const settings = await getSettings();
  const showAll = show === "all";

  const products = await db.product.findMany({
    where: showAll ? {} : { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Prices are in naira. Stock drops automatically when customers check out."
        actions={
          <>
            <Link href={showAll ? "/admin/products" : "/admin/products?show=all"} className={btnGhost}>
              {showAll ? "Hide hidden products" : "Show hidden products"}
            </Link>
            <Link href="/admin/products/new" className={btn}>Add product</Link>
          </>
        }
      />
      {saved && <Banner kind="ok">Saved.</Banner>}
      {error && <Banner>{error}</Banner>}

      {products.length === 0 ? (
        <Empty
          title="No products yet"
          hint="Add your first product to start selling."
          action={<Link href="/admin/products/new" className={btn}>Add your first product</Link>}
        />
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[760px]">
            <thead className="border-b border-white/10">
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Price</th>
                <th className={th}>Stock</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {products.map((p) => (
                <tr key={p.id} className={p.active ? "" : "opacity-60"}>
                  <td className={td}>
                    <Link href={`/admin/products/${p.id}`} className="font-medium hover:text-[#D4AF37]">{p.name}</Link>
                    <p className="text-xs text-[#9A9585]">{p.isAddOn ? "Add-on · " : ""}{p.category ?? "No category"} · per {p.unit}</p>
                  </td>
                  <td className={td}>{formatNaira(p.priceKobo)}</td>
                  <td className={td}>
                    <form action={setStock} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        name="stock"
                        type="number"
                        min={0}
                        defaultValue={p.stockQty}
                        className={`${input} w-24 ${p.stockQty <= settings.lowStockThreshold ? "border-orange-400/60" : ""}`}
                      />
                      <button type="submit" className={btnGhost}>Update</button>
                    </form>
                  </td>
                  <td className={td}>{p.active ? "Visible" : "Hidden"}</td>
                  <td className={`${td} text-right`}>
                    <form action={toggleProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-xs text-[#9A9585] underline hover:text-[#D4AF37]">
                        {p.active ? "Hide" : "Show"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
