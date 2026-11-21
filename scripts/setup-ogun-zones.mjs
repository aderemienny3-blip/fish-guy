// Adds Ogun State delivery areas, all switched OFF with no fee yet.
// You set each fee, minimum order and delivery days in Admin > Delivery, then tick "On".
// Safe to re-run (existing names are skipped).
import { PrismaClient } from "@prisma/client";

const AREAS = [
  ["Ota (Covenant & Bells)", "Campus delivery to Ota."],
  ["Ilishan-Remo (Babcock)", "Campus delivery to Ilishan-Remo."],
  ["Ago-Iwoye (OOU)", "Campus delivery to Ago-Iwoye."],
  ["Abeokuta (FUNAAB, Crescent, MAPOLY, FCE Osiele)", "Campus delivery in Abeokuta."],
  ["Ijagun (TASUED)", "Campus delivery to Ijagun."],
  ["Igbesa (Crawford)", "Campus delivery to Igbesa."],
  ["Ilaro (Federal Polytechnic)", "Campus delivery to Ilaro."],
];

const db = new PrismaClient();
try {
  let added = 0;
  for (const [name, note] of AREAS) {
    if (await db.deliveryZone.findUnique({ where: { name } })) continue;
    await db.deliveryZone.create({ data: { name, note, feeKobo: 0, active: false } });
    added++;
  }
  console.log(`Added ${added} Ogun areas (${AREAS.length - added} already existed). They are OFF until you set fees.`);
} finally {
  await db.$disconnect();
}
