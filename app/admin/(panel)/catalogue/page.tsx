import Link from "next/link";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { productIssues } from "@/lib/catalogue-health";
import { Banner, Empty, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import { saveCatalogue } from "./actions";

export const dynamic = "force-dynamic";

export default async function Catalogue({ searchParams }: { searchParams: Promise<{ saved?: string; all?: string }> }) {
  await requireAdmin(MANAGERS);
  const q = await searchParams;
  const products = await db.product.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const rows = products.map((p) => ({ p, issues: productIssues(p) }));
  const shown = q.all ? rows : rows.filter((r) => r.issues.length > 0);
  const ready = rows.filter((r) => r.issues.length === 0).length;

  return (
    <>
      <PageHeader title="Catalogue health" subtitle={`${ready} of ${rows.length} active products are fully ready.`} actions={<Link href={q.all ? "/admin/catalogue" : "/admin/catalogue?all=1"} className={btnGhost}>{q.all ? "Only products with problems" : "Show all products"}</Link>} />
      {q.saved && <Banner kind="ok">Saved.</Banner>}
      {shown.length === 0 ? <Empty title={rows.length === 0 ? "No active products yet" : "Every product is ready"} hint="Photos are added on the product page. Costs are set on Cost and margin." /> : (
        <div className="space-y-4">
          {shown.map(({ p, issues }) => (
            <article key={p.id} className={`${card} space-y-3 p-5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{p.name}</p>
                <Link href={`/admin/products/${p.id}`} className="text-sm text-[#D4AF37] hover:underline">Open product (photo, price, stock)</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {issues.length === 0 ? <span className="rounded-full border border-emerald-400/50 px-2.5 py-0.5 text-xs text-emerald-300">Ready</span> : issues.map((i) => <span key={i} className="rounded-full border border-orange-400/50 px-2.5 py-0.5 text-xs text-orange-300">{i}</span>)}
              </div>
              <form action={saveCatalogue} className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <input type="hidden" name="id" value={p.id} />
                <div><span className={label}>Description</span><textarea name="description" defaultValue={p.description ?? ""} rows={3} maxLength={600} className={input} /></div>
                <div><span className={label}>Size guide (what a customer gets per kg or pack)</span><textarea name="sizeGuide" defaultValue={p.sizeGuide ?? ""} rows={3} maxLength={200} placeholder="Write what is true for this product, for example how many pieces per kg" className={input} /></div>
                <button type="submit" className={btn}>Save</button>
              </form>
            </article>
          ))}
        </div>
      )}
      <p className="mt-4 max-w-3xl text-sm text-[#9A9585]">The size guide shows on the product page. Fill it in only from what you have actually weighed or counted. Nothing is written for you.</p>
    </>
  );
}
