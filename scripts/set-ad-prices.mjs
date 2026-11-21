// Puts the Fish Guy Ads packages ON SALE at launch prices, so /advertise opens instead of "coming soon".
// Safe to re-run: it updates packages with the same name instead of adding copies.   node scripts/set-ad-prices.mjs
// Change any price later in Admin > Ads > Packages. Prices only affect new bookings.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Launch prices in kobo (naira x 100). Kept within reach of independent Nigerian artists; raise them once
// Admin > Ads shows real views and clicks that justify it.
const PACKAGES = [
  { name: "Sponsored sticker, 7 days", placement: "STICKER", priceKobo: 500_000, durationDays: 7, maxConcurrent: 3,
    description: "Your song tagged on the most-ordered products in the shop for a week." },
  { name: "Popup spotlight, 7 days", placement: "POPUP", priceKobo: 1_500_000, durationDays: 7, maxConcurrent: 2,
    description: "A card with your cover art that opens once per visit on the home page and shop." },
  { name: "Featured sound strip, 7 days", placement: "FEATURED_STRIP", priceKobo: 2_500_000, durationDays: 7, maxConcurrent: 2,
    description: "A banner with your cover art near the top of the home page." },
  { name: "Homepage hero image, 7 days", placement: "HERO_BANNER", priceKobo: 5_000_000, durationDays: 7, maxConcurrent: 1,
    description: "Your artwork takes over the big home page picture. The only ad in that spot." },
];

try {
  for (const p of PACKAGES) {
    const existing = await db.adPackage.findFirst({ where: { name: p.name } });
    if (existing) {
      await db.adPackage.update({ where: { id: existing.id }, data: { ...p, active: true } });
      console.log(`updated  ${p.name}  ₦${p.priceKobo / 100}`);
    } else {
      await db.adPackage.create({ data: { ...p, active: true } });
      console.log(`added    ${p.name}  ₦${p.priceKobo / 100}`);
    }
  }
  console.log("\nFish Guy Ads is open for booking. Check /advertise.");
} finally {
  await db.$disconnect();
}
