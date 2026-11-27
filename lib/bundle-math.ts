// Bundle deals. Pure maths, used by both the checkout page and the server so they always agree.
export type BundleDef = { id: string; name: string; priceKobo: number; items: { productId: string; quantity: number }[] };
export type AppliedBundle = { id: string; name: string; count: number; savingKobo: number };

/** What the bundle's items cost bought one by one, or null when a product price is missing. */
export function retailOf(b: BundleDef, price: Map<string, number>): number | null {
  let sum = 0;
  for (const i of b.items) {
    const p = price.get(i.productId);
    if (p === undefined) return null;
    sum += p * i.quantity;
  }
  return sum;
}

/**
 * Finds complete bundles inside a cart and totals the saving. Each unit of a product counts toward one bundle only;
 * where bundles overlap, the one that saves the most per set is used first.
 */
export function applyBundles(bundles: BundleDef[], qty: Map<string, number>, price: Map<string, number>): { savingKobo: number; applied: AppliedBundle[] } {
  const left = new Map(qty);
  const ranked = bundles
    .map((b) => { const retail = retailOf(b, price); return { b, per: retail === null ? 0 : retail - b.priceKobo }; })
    .filter((x) => x.per > 0 && x.b.items.length > 0)
    .sort((a, b) => b.per - a.per || a.b.id.localeCompare(b.b.id));
  const applied: AppliedBundle[] = [];
  let savingKobo = 0;
  for (const { b, per } of ranked) {
    const count = Math.min(...b.items.map((i) => Math.floor((left.get(i.productId) ?? 0) / i.quantity)));
    if (!(count >= 1)) continue;
    for (const i of b.items) left.set(i.productId, (left.get(i.productId) ?? 0) - i.quantity * count);
    applied.push({ id: b.id, name: b.name, count, savingKobo: per * count });
    savingKobo += per * count;
  }
  return { savingKobo, applied };
}
