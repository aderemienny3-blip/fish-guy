/** Margin as a percentage of the selling price, or null when there is no cost or price. */
export function marginPct(priceKobo: number, costKobo: number | null): number | null {
  if (costKobo === null || priceKobo <= 0) return null;
  return Math.round(((priceKobo - costKobo) / priceKobo) * 1000) / 10;
}

export type SoldLine = { productId: string; unitPriceKobo: number; quantity: number };

/** Units, sales and gross profit per product. Gross profit is only counted for products that have a cost. */
export function productProfit(lines: SoldLine[], costs: Map<string, number | null>) {
  const out = new Map<string, { units: number; salesKobo: number; profitKobo: number | null }>();
  for (const l of lines) {
    const r = out.get(l.productId) ?? { units: 0, salesKobo: 0, profitKobo: null as number | null };
    r.units += l.quantity;
    r.salesKobo += l.unitPriceKobo * l.quantity;
    const c = costs.get(l.productId);
    if (c !== null && c !== undefined) r.profitKobo = (r.profitKobo ?? 0) + (l.unitPriceKobo - c) * l.quantity;
    out.set(l.productId, r);
  }
  return out;
}

/** Cost per paid order and sales per naira spent. Null when there is nothing to divide by. */
export function adMath(spendKobo: number, orders: number, salesKobo: number) {
  return {
    cpaKobo: orders > 0 && spendKobo > 0 ? Math.round(spendKobo / orders) : null,
    roas: spendKobo > 0 ? Math.round((salesKobo / spendKobo) * 100) / 100 : null,
  };
}
