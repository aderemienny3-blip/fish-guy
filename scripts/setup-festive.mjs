// Adds "Store pickup" as a delivery choice (free, no address needed). Safe to re-run.
//   node scripts/setup-festive.mjs
// Then put your shop address in lib/business.ts (address: "...") so customers see where to collect.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
try {
  const existing = await db.deliveryZone.findFirst({ where: { isPickup: true } });
  if (existing) {
    console.log(`Store pickup already set up ("${existing.name}").`);
  } else {
    const clash = await db.deliveryZone.findUnique({ where: { name: "Store pickup" } });
    if (clash) {
      await db.deliveryZone.update({ where: { id: clash.id }, data: { isPickup: true, feeKobo: 0, freeOverKobo: null, active: true } });
    } else {
      await db.deliveryZone.create({ data: { name: "Store pickup", feeKobo: 0, isPickup: true, active: true } });
    }
    console.log("Added Store pickup.");
  }
} finally {
  await db.$disconnect();
}
