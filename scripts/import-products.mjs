// One-time import of the product list from fishguyshop.netlify.app (prices per kg).
// Run with:  node scripts/import-products.mjs
// Safe to re-run: products that already exist (same slug) are skipped, never overwritten.
// Products are created HIDDEN with stock 0, so nothing is sold until you set real stock.
import { PrismaClient } from "@prisma/client";

const items = [
  ["Kote", "Fish", 5200],
  ["Shawa", "Fish", 3000],
  ["Titus", "Fish", 9000],
  ["Panla osan", "Fish", 3400],
  ["Hake", "Fish", 4400],
  ["Croaker", "Fish", 5000],
  ["Owere", "Fish", 3500],
  ["Rock fish", "Fish", 4000],
  ["Tilapia", "Fish", 4200],
  ["Turkey", "Turkey", 9000],
  ["Turkey finger", "Turkey", 6500],
  ["Chicken laps", "Chicken", 6000],
  ["Wings", "Chicken", 7000],
  ["Fryer", "Chicken", 5000],
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const db = new PrismaClient();
try {
  const r = await db.product.createMany({
    data: items.map(([name, category, naira]) => ({
      name,
      slug: slugify(name),
      category,
      priceKobo: naira * 100,
      unit: "kg",
      stockQty: 0,
      active: false,
    })),
    skipDuplicates: true,
  });
  console.log(`Added ${r.count} products (hidden, stock 0). ${items.length - r.count} already existed.`);
  console.log("Next: Admin > Products > set real stock, then click Show on each product you want to sell.");
} finally {
  await db.$disconnect();
}
