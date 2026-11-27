export type HealthInput = { imageUrl: string | null; description: string | null; sizeGuide: string | null; costKobo: number | null; stockQty: number; isAddOn: boolean };

/** What is missing or wrong on a product page. Empty list means the product is ready. */
export function productIssues(p: HealthInput): string[] {
  const out: string[] = [];
  if (!p.imageUrl) out.push("No photo");
  if (!p.description || p.description.trim().length < 20) out.push("No description");
  if (!p.isAddOn && !(p.sizeGuide && p.sizeGuide.trim())) out.push("No size guide");
  if (p.costKobo === null) out.push("No cost set");
  if (p.stockQty <= 0) out.push("Out of stock");
  return out;
}
