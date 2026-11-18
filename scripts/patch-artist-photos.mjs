// Adds Upload photo / Upload banner to the artist form. Safe to run more than once.
// Run in the project folder:  node scripts/patch-artist-photos.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

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

patch("components/admin/ProductPhotoField.tsx", [
  { done: 'name = "imageUrl"', find: 'export default function ProductPhotoField({ initial, title = "Product photo" }: { initial: string; title?: string }) {',
    replace: 'export default function ProductPhotoField({ initial, title = "Product photo", name = "imageUrl" }: { initial: string; title?: string; name?: string }) {' },
  { done: "name={name}", find: '<input type="hidden" name="imageUrl" value={url} />', replace: '<input type="hidden" name={name} value={url} />' },
  { done: 'alt=""', find: 'alt="Product"', replace: 'alt=""' },
]);

patch("app/admin/(panel)/music/actions.ts", [
  { done: "products%2F", find: 'const httpsOrEmpty = (v: string) => v === "" || /^https:\\/\\//i.test(v);',
    replace: 'const httpsOrEmpty = (v: string) => v === "" || /^https:\\/\\//i.test(v) || /^\\/api\\/shop\\/photo\\?p=products%2F[A-Za-z0-9._-]{1,150}$/.test(v);' },
]);

console.log(problems ? `\n${problems} problem(s) above. Tell me what it printed.` : "\nAll done.");
