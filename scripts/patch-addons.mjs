// Wires add-ons into your existing files. Safe to run more than once.
// Run in the project folder:  node scripts/patch-addons.mjs
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

patch("prisma/schema.prisma", [
  { done: "isAddOn", find: "  active      Boolean     @default(true)\n  createdAt   DateTime    @default(now())\n  updatedAt   DateTime    @updatedAt\n  items       OrderItem[]",
    replace: "  active      Boolean     @default(true)\n  isAddOn     Boolean     @default(false) // ponmo, plantain and other extras\n  createdAt   DateTime    @default(now())\n  updatedAt   DateTime    @updatedAt\n  items       OrderItem[]" },
]);

patch("lib/shop/data.ts", [
  { done: "isAddOn: boolean;", find: "  sponsor: AdView | null;\n};", replace: "  sponsor: AdView | null;\n  isAddOn: boolean;\n};" },
  { done: "isAddOn: p.isAddOn,", find: "  stockQty: p.stockQty,\n  mostOrdered", replace: "  stockQty: p.stockQty,\n  isAddOn: p.isAddOn,\n  mostOrdered" },
  { done: "const addOns = rows.filter", find: "  const all = rows.map((p) => toView(p, top, stickers));",
    replace: "  const all = rows.filter((p) => !p.isAddOn).map((p) => toView(p, top, stickers));\n  const addOns = rows.filter((p) => p.isAddOn).map((p) => toView(p, top));" },
  { done: "hasAny: all.length > 0, addOns", find: "  return { products, categories, hasAny: all.length > 0 };", replace: "  return { products, categories, hasAny: all.length > 0, addOns };" },
]);

patch("app/(site)/shop/page.tsx", [
  { done: "addOns }", find: "const { products, categories, hasAny } = await getShopData(category);", replace: "const { products, categories, hasAny, addOns } = await getShopData(category);" },
  { done: "(categories.length > 0 || addOns.length > 0)", find: "{categories.length > 0 && (", replace: "{(categories.length > 0 || addOns.length > 0) && (" },
  { done: 'href="/shop#add-ons"', find: "        </nav>\n      )}", replace: '          {addOns.length > 0 && <a href="/shop#add-ons" className="filter-addons">Add-ons</a>}\n        </nav>\n      )}' },
  { done: 'id="add-ons"', find: "      </section>\n    </main>",
    replace: '      </section>\n      {addOns.length > 0 && !selected && (\n        <section id="add-ons" className="addon-section" aria-label="Add-ons">\n          <h2>Add-ons</h2>\n          <p>Ponmo, plantain and more. Add them to any order.</p>\n          <div className="product-grid">{addOns.map((p) => <ProductCard key={p.id} product={p} />)}</div>\n        </section>\n      )}\n    </main>' },
]);

patch("app/(site)/shop/[productSlug]/page.tsx", [
  { done: "AddOnShelf", find: 'import { getProductBySlug } from "@/lib/shop/data";', replace: 'import { getProductBySlug } from "@/lib/shop/data";\nimport { getAddOns } from "@/lib/shop/addons";\nimport { AddOnShelf } from "@/components/shop/addon-shelf";' },
  { done: "const addOns = p.isAddOn", find: "  const low = stockLabel(p);", replace: "  const low = stockLabel(p);\n  const addOns = p.isAddOn ? [] : await getAddOns();" },
  { done: "<AddOnShelf", find: "      </section>\n    </main>", replace: '      </section>\n      <AddOnShelf items={addOns} title="Goes well with this" note="Add ponmo, plantain and more in one tap." />\n    </main>' },
]);

patch("components/shop/cart-drawer.tsx", [
  { done: "CartAddOns", find: 'import { useCart } from "@/components/shop/cart";', replace: 'import { useCart } from "@/components/shop/cart";\nimport { CartAddOns } from "@/components/shop/addon-shelf";' },
  { done: "<CartAddOns />", find: '          <div className="cart-drawer-footer">', replace: '          {lines.length > 0 && <CartAddOns />}\n\n          <div className="cart-drawer-footer">' },
]);

patch("components/admin/ProductFields.tsx", [
  { done: 'name="isAddOn"', find: "        Visible in the shop\n      </label>",
    replace: '        Visible in the shop\n      </label>\n\n      <label className="flex items-center gap-2 text-sm">\n        <input type="checkbox" name="isAddOn" defaultChecked={product ? product.isAddOn : false} className="h-4 w-4 accent-[#D4AF37]" />\n        Add-on (ponmo, plantain, sides). Shown in the Add-ons section and offered in the cart.\n      </label>' },
]);

patch("app/admin/(panel)/products/actions.ts", [
  { done: 'isAddOn: fd.get("isAddOn") === "on"', find: '    active: fd.get("active") === "on",', replace: '    active: fd.get("active") === "on",\n    isAddOn: fd.get("isAddOn") === "on",' },
]);

patch("app/admin/(panel)/products/page.tsx", [
  { done: "p.isAddOn", find: "{p.category ?? \"No category\"} · per {p.unit}", replace: "{p.isAddOn ? \"Add-on · \" : \"\"}{p.category ?? \"No category\"} · per {p.unit}" },
]);

patch("app/(site)/layout.tsx", [
  { done: 'import "./addons.css"', find: 'import "./site.css";', replace: 'import "./site.css";\nimport "./addons.css";' },
]);

console.log(problems ? `\n${problems} problem(s) above. Tell me what it printed.` : "\nAll done.");
