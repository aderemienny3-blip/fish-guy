// Ticks "Add-on" on products you already have whose names look like add-ons (ponmo, plantain, dodo...).
// It never creates products. Safe to re-run. You can also tick the box by hand in Admin > Products.
//   node scripts/mark-addons.mjs
import { PrismaClient } from "@prisma/client";

const WORDS = ["ponmo", "kpomo", "plantain", "dodo"];
const db = new PrismaClient();
try {
  const all = await db.product.findMany({ select: { id: true, name: true, isAddOn: true } });
  const hits = all.filter((p) => WORDS.some((w) => p.name.toLowerCase().includes(w)));
  if (hits.length === 0) console.log("No products with those names yet. Add them in Admin > Products and tick 'Add-on'.");
  for (const p of hits) {
    if (!p.isAddOn) await db.product.update({ where: { id: p.id }, data: { isAddOn: true } });
    console.log(`${p.isAddOn ? "already" : "marked "}  ${p.name}`);
  }
} finally {
  await db.$disconnect();
}
