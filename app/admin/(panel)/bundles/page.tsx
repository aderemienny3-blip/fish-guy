import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { Banner, Empty, PageHeader, btn, btnDanger, card, input, label } from "@/components/admin/ui";
import { formatNaira } from "@/lib/money";
import { deleteBundle, saveBundle } from "./actions";

export const dynamic = "force-dynamic";

type P = { id: string; name: string; priceKobo: number; unit: string };
type B = { id: string; name: string; description: string | null; priceKobo: number; active: boolean; items: { productId: string; quantity: number }[] };

function BundleForm({ products, bundle }: { products: P[]; bundle?: B }) {
  const qty = new Map((bundle?.items ?? []).map((i) => [i.productId, i.quantity]));
  return (
    <form action={saveBundle} className="space-y-4">
      {bundle && <input type="hidden" name="id" value={bundle.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className={label}>Bundle name</label><input name="name" defaultValue={bundle?.name ?? ""} className={input} required maxLength={60} placeholder="Family freezer pack" /></div>
        <div><label className={label}>Bundle price (naira)</label><input name="price" defaultValue={bundle ? bundle.priceKobo / 100 : ""} inputMode="decimal" className={input} required /></div>
        <div className="md:col-span-2"><label className={label}>Short description (optional)</label><input name="description" defaultValue={bundle?.description ?? ""} className={input} maxLength={200} /></div>
      </div>
      <div>
        <p className={label}>What is in it (leave 0 for products not included)</p>
        <div className="grid gap-2 md:grid-cols-2">
          {products.map((p) => (
            <label key={p.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 px-3 py-2 text-sm">
              <span>{p.name} <span className="text-[#9A9585]">{formatNaira(p.priceKobo)} / {p.unit}</span></span>
              <input name={`q-${p.id}`} type="number" min={0} max={50} defaultValue={qty.get(p.id) ?? 0} className="w-20 rounded-md border border-white/15 bg-[#0A0A0A] px-2 py-1 text-right" />
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={bundle ? bundle.active : true} /> Show this bundle on the shop</label>
      <button className={btn}>{bundle ? "Save changes" : "Create bundle"}</button>
    </form>
  );
}

export default async function Bundles({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const [products, bundles] = await Promise.all([
    db.product.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { name: "asc" }], select: { id: true, name: true, priceKobo: true, unit: true } }),
    db.bundle.findMany({ orderBy: { createdAt: "desc" }, include: { items: true } }),
  ]);
  const retail = (b: B) => b.items.reduce((n, i) => n + (products.find((p) => p.id === i.productId)?.priceKobo ?? 0) * i.quantity, 0);

  return (
    <>
      <PageHeader title="Bundles" subtitle="A set of products at one lower price. The saving is applied at checkout when all the items are in the cart." />
      {q.saved && <Banner kind="ok">Saved.</Banner>}
      {q.error && <Banner>{q.error}</Banner>}
      <div className={`${card} mb-8 max-w-3xl p-6`}>
        <h2 className="mb-4 text-lg font-medium">New bundle</h2>
        {products.length === 0 ? <p className="text-sm text-[#9A9585]">Add products first.</p> : <BundleForm products={products} />}
      </div>
      <h2 className="mb-3 text-lg font-medium">Your bundles</h2>
      {bundles.length === 0 ? <Empty title="No bundles yet" hint="Create one above." /> : (
        <div className="space-y-3">
          {bundles.map((b) => (
            <details key={b.id} className={`${card} p-4`}>
              <summary className="cursor-pointer text-sm"><strong>{b.name}</strong> · {formatNaira(b.priceKobo)} <span className="text-[#9A9585]">(items {formatNaira(retail(b))}) {b.active ? "" : "· hidden"}</span></summary>
              <div className="mt-4 space-y-4">
                <BundleForm products={products} bundle={b} />
                <form action={deleteBundle}><input type="hidden" name="id" value={b.id} /><button className={btnDanger}>Delete bundle</button></form>
              </div>
            </details>
          ))}
        </div>
      )}
    </>
  );
}
