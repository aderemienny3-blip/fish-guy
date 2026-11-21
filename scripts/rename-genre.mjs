// Renames the "Afrobeats-hip-hop" genre to "Hip-hop" in the site list and on existing tracks.
// Safe to re-run. Run from the project root:  node scripts/rename-genre.mjs
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";

const FILE = "lib/music/data.ts";
let problems = 0;
if (!fs.existsSync(FILE)) { console.log(`SKIP ${FILE} (not found)`); problems++; }
else {
  const raw = fs.readFileSync(FILE, "utf8");
  if (raw.includes('"Afrobeats-hip-hop"')) {
    fs.writeFileSync(FILE, raw.replace('"Afrobeats-hip-hop"', '"Hip-hop"'));
    console.log(`done ${FILE}: genre list now says Hip-hop`);
  } else if (raw.includes('"Hip-hop"')) console.log(`ok   ${FILE} (already Hip-hop)`);
  else { console.log(`SKIP ${FILE}: genre list not found`); problems++; }
}

const db = new PrismaClient();
try {
  const r = await db.track.updateMany({ where: { genre: { in: ["Afrobeats-hip-hop", "Afrobeats hip-hop", "Afro-hip-hop"] } }, data: { genre: "Hip-hop" } });
  console.log(`Updated ${r.count} existing track(s) to Hip-hop.`);
} catch (e) {
  console.log("Could not update tracks:", e instanceof Error ? e.message : e);
  problems++;
} finally {
  await db.$disconnect();
}
console.log(problems ? "Finished with notes above." : "All done.");
