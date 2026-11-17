// Adds Lagos' Local Council Development Areas (LCDAs) as delivery areas, on top of the 19 local governments.
// Ikorodu local government and its 5 LCDAs (Ikorodu North, Ikorodu West, Igbogbo-Baiyeku, Ijede, Imota) are NOT added.
//
//   node scripts/add-lcdas.mjs --fee 3000 --far-fee 6000
//
// Safe to re-run: areas that already exist are skipped and never overwritten.
import { PrismaClient } from "@prisma/client";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
}
const num = (v) => (v !== null && /^\d+$/.test(v) ? Number(v) : null);
const fee = num(arg("fee"));
const farFee = num(arg("far-fee")) ?? fee;
if (fee === null) {
  console.error("Missing --fee. Example: node scripts/add-lcdas.mjs --fee 3000 --far-fee 6000");
  process.exit(1);
}

const LCDAS = [
  "Agbado-Oke Odo", "Agboyi-Ketu", "Apapa-Iganmu", "Ayobo-Ipaja", "Badagry West", "Bariga",
  "Coker-Aguda", "Egbe-Idimu", "Ejigbo", "Eredo", "Eti-Osa East", "Iba", "Ifelodun",
  "Igando-Ikotun", "Ikosi-Ejinrin", "Ikosi-Isheri", "Ikoyi-Obalende", "Iru-Victoria Island",
  "Isolo", "Itire-Ikate", "Lagos Island East", "Lekki", "Mosan-Okunola", "Odi-Olowo", "Ojodu",
  "Ojokoro", "Olorunda", "Onigbongbo", "Oriade", "Orile-Agege", "Oto-Awori", "Yaba",
];
// Far from the mainland: these get the far fee.
const FAR = new Set(["Badagry West", "Eredo", "Ikosi-Ejinrin", "Olorunda"]);

const db = new PrismaClient();
try {
  const r = await db.deliveryZone.createMany({
    data: LCDAS.map((name) => ({ name, feeKobo: (FAR.has(name) ? farFee : fee) * 100, active: true })),
    skipDuplicates: true,
  });
  console.log(`Added ${r.count} LCDA delivery areas (${LCDAS.length - r.count} already existed).`);
  console.log(`Far fee applied to: ${[...FAR].join(", ")}.`);
} finally {
  await db.$disconnect();
}
