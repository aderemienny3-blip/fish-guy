// Loads the new artist page styles. Safe to run more than once.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const file = "app/(site)/layout.tsx";
if (!existsSync(file)) { console.log(`MISSING  ${file}`); process.exit(1); }
let s = readFileSync(file, "utf8");
const crlf = s.includes("\r\n"); if (crlf) s = s.replace(/\r\n/g, "\n");
if (s.includes('./artist-page.css')) console.log(`ok       ${file}`);
else if (!s.includes('import "./site.css";')) { console.log(`CANNOT PATCH  ${file}`); process.exit(1); }
else { s = s.replace('import "./site.css";', 'import "./site.css";\nimport "./artist-page.css";'); writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s); console.log(`patched  ${file}`); }
console.log("\nAll done.");
