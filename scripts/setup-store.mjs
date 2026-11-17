// One-time store setup. Run with your own delivery fees (in naira):
//
//   node scripts/setup-store.mjs --fee 3000 --far-fee 6000 --capacity 20
//
//   --fee       delivery fee for every area                         (required)
//   --far-fee   fee for the far areas: Badagry, Epe, Ibeju-Lekki    (optional, default = --fee)
//   --capacity  max orders per slot per day; creates 4 delivery slots if you have none (optional)
//
// What it does:
//   1. Every product that has 0 stock gets 100 (kg) and is made visible in the shop.
//   2. Creates a delivery area for every Lagos local government EXCEPT Ikorodu.
//      Existing areas are left alone, so your later edits are never overwritten.
//   3. With --capacity, creates the slots 9-12, 12-3, 3-6 and 6-9 (inside 8:30 AM - 9:00 PM).
import { PrismaClient } from "@prisma/client";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
}
const num = (v) => (v !== null && /^\d+$/.test(v) ? Number(v) : null);

const fee = num(arg("fee"));
const farFee = num(arg("far-fee")) ?? fee;
const capacity = num(arg("capacity"));

if (fee === null || fee < 0) {
  console.error("Missing --fee. Example: node scripts/setup-store.mjs --fee 3000 --far-fee 6000 --capacity 20");
  process.exit(1);
}

// The 20 Lagos State local governments, minus Ikorodu (not served).
const AREAS = [
  "Agege", "Ajeromi-Ifelodun", "Alimosho", "Amuwo-Odofin", "Apapa", "Badagry", "Epe",
  "Eti-Osa", "Ibeju-Lekki", "Ifako-Ijaiye", "Ikeja", "Kosofe", "Lagos Island",
  "Lagos Mainland", "Mushin", "Ojo", "Oshodi-Isolo", "Shomolu", "Surulere",
];
const FAR = new Set(["Badagry", "Epe", "Ibeju-Lekki"]);

const SLOTS = [
  ["9:00 AM - 12:00 PM", 540, 720],
  ["12:00 PM - 3:00 PM", 720, 900],
  ["3:00 PM - 6:00 PM", 900, 1080],
  ["6:00 PM - 9:00 PM", 1080, 1260],
];

const db = new PrismaClient();
try {
  const stocked = await db.product.updateMany({
    where: { stockQty: 0 },
    data: { stockQty: 100, active: true },
  });
  console.log(`Products set to 100 kg and visible: ${stocked.count}`);

  const zones = await db.deliveryZone.createMany({
    data: AREAS.map((name) => ({
      name,
      feeKobo: (FAR.has(name) ? farFee : fee) * 100,
      active: true,
    })),
    skipDuplicates: true,
  });
  console.log(`Delivery areas added: ${zones.count} (Ikorodu is not included).`);

  if (capacity !== null && capacity >= 1) {
    if ((await db.deliverySlot.count()) === 0) {
      await db.deliverySlot.createMany({
        data: SLOTS.map(([label, startMinute, endMinute]) => ({ label, startMinute, endMinute, maxOrders: capacity })),
      });
      console.log(`Delivery slots added: ${SLOTS.length}, ${capacity} orders each.`);
    } else {
      console.log("Slots already exist, so none were added.");
    }
  } else {
    console.log("No slots added. Use --capacity 20 to add them, or add them in Admin > Delivery.");
  }
} finally {
  await db.$disconnect();
}
