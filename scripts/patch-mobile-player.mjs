// Fixes the music player on phones: buttons were cut off the bottom of the screen. Also adds lock screen controls.
// No database change. Safe to re-run.
import fs from "node:fs";
import { spawnSync } from "node:child_process";

const layout = "app/(site)/layout.tsx";
if (!fs.existsSync(layout) || !fs.existsSync("app/(site)/mobile-player.css")) { console.log("Stop: run this from the project folder, after unzipping."); process.exit(1); }

// The phone styles must load last, so they win over the older ones.
const raw = fs.readFileSync(layout, "utf8");
const crlf = raw.includes("\r\n");
let src = raw.replace(/\r\n/g, "\n");
if (src.includes("mobile-player.css")) console.log("ok   layout.tsx: phone styles (already done)");
else {
  const lines = src.split("\n");
  let last = -1;
  lines.forEach((l, i) => { if (/^import\s+["']\.\/[\w-]+\.css["'];?\s*$/.test(l)) last = i; });
  if (last < 0) { console.log("SKIP app/(site)/layout.tsx: no css imports found. Send me this line."); process.exit(1); }
  lines.splice(last + 1, 0, 'import "./mobile-player.css";');
  src = lines.join("\n");
  fs.writeFileSync(layout, crlf ? src.replace(/\n/g, "\r\n") : src);
  console.log("done app/(site)/layout.tsx: phone styles");
}

const r = spawnSync(process.execPath, ["scripts/patch-lockscreen.mjs"], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
