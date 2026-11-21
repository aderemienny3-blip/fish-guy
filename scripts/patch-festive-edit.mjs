// Makes the festive pop-up and top strip editable. Needs the festive deals update installed first. Safe to run more than once.
// Run in the project folder:  node scripts/patch-festive-edit.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (!existsSync("lib/festive.ts")) {
  console.log("Install the festive deals update first (fish-guy-festive.zip), then run this again.");
  process.exit(1);
}

let problems = 0;
function patch(file, steps) {
  if (!existsSync(file)) { console.log(`MISSING  ${file}`); problems++; return; }
  let s = readFileSync(file, "utf8");
  const crlf = s.includes("\r\n");
  if (crlf) s = s.replace(/\r\n/g, "\n");
  let changed = 0;
  for (const st of steps) {
    if (s.includes(st.done)) continue;
    if (!s.includes(st.find)) { console.log(`CANNOT PATCH  ${file}  (could not find: ${st.find.split("\n")[0].trim()})`); problems++; continue; }
    s = s.replace(st.find, st.replace);
    changed++;
  }
  if (changed) writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`${changed ? "patched " : "ok      "} ${file}`);
}

patch("prisma/schema.prisma", [
  { done: "popupEnabled", find: "  stackWithStudent Boolean  @default(false)\n  updatedAt        DateTime @updatedAt",
    replace: `  stackWithStudent Boolean  @default(false)
  popupEnabled     Boolean  @default(true)
  ribbonEnabled    Boolean  @default(true)
  ribbonText       String?
  popupImage       String?
  popupHeadline    String?
  popupMessage     String?
  popupButton      String?
  popupLink        String   @default("/festive")
  popupDelay       Int      @default(2)
  popupFrequency   String   @default("VISIT") // VISIT | DAY
  popupShowOffers  Boolean  @default(true)
  updatedAt        DateTime @updatedAt` },
]);

patch("lib/festive-math.ts", [
  { done: "popupEnabled?: boolean;", find: "  stackWithStudent: boolean;\n};",
    replace: `  stackWithStudent: boolean;
  // Pop-up and strip, edited in Admin > Festive deals
  popupEnabled?: boolean;
  ribbonEnabled?: boolean;
  ribbonText?: string | null;
  popupImage?: string | null;
  popupHeadline?: string | null;
  popupMessage?: string | null;
  popupButton?: string | null;
  popupLink?: string | null;
  popupDelay?: number;
  popupFrequency?: "VISIT" | "DAY";
  popupShowOffers?: boolean;
};` },
]);

patch("lib/festive.ts", [
  { done: "popupEnabled: row.popupEnabled", find: "    stackWithStudent: row.stackWithStudent,\n  };",
    replace: `    stackWithStudent: row.stackWithStudent,
    popupEnabled: row.popupEnabled,
    ribbonEnabled: row.ribbonEnabled,
    ribbonText: row.ribbonText,
    popupImage: row.popupImage,
    popupHeadline: row.popupHeadline,
    popupMessage: row.popupMessage,
    popupButton: row.popupButton,
    popupLink: row.popupLink,
    popupDelay: row.popupDelay,
    popupFrequency: row.popupFrequency === "DAY" ? "DAY" : "VISIT",
    popupShowOffers: row.popupShowOffers,
  };` },
  { done: "export async function getPreviewPromo", find: "/** For pages: the offer that is live right now, or null. Never throws. */",
    replace: `/** For the admin preview: the saved offer even when it is off or not started. Never throws. */
export async function getPreviewPromo(): Promise<PromoRules | null> {
  try {
    const row = await db.festivePromo.findUnique({ where: { id: 1 } });
    return row ? toRules(row, await giftsClaimed(db)) : null;
  } catch {
    return null;
  }
}

/** For pages: the offer that is live right now, or null. Never throws. */` },
]);

patch("app/(site)/layout.tsx", [
  { done: 'import "./festive-edit.css"', find: 'import "./festive.css";', replace: 'import "./festive.css";\nimport "./festive-edit.css";' },
]);

console.log(problems ? `\n${problems} problem(s) above. Tell me what it printed.` : "\nAll done.");
