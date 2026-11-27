// Operations kit: riders, proof of delivery, cold-chain check, complaints, cost and margin,
// unpaid-orders list, ad scorecard, activity log, order board filters. Safe to re-run.
import fs from "node:fs";
for (const f of ["lib/attribution.ts", "components/admin/ui.tsx", "lib/admin/orders.ts"]) {
  if (!fs.existsSync(f)) { console.log(`Stop: ${f} is missing. Install the earlier zips first, then run this again.`); process.exit(1); }
}
let problems = 0;
function patch(file, steps) {
  if (!fs.existsSync(file)) { console.log(`SKIP ${file} (not found)`); problems++; return; }
  const raw = fs.readFileSync(file, "utf8");
  const crlf = raw.includes("\r\n");
  let src = raw.replace(/\r\n/g, "\n");
  let changed = false;
  for (const { label, done, from, to } of steps) {
    if (src.includes(done)) { console.log(`ok   ${file}: ${label} (already done)`); continue; }
    if (!src.includes(from)) { console.log(`SKIP ${file}: ${label} (anchor not found)`); problems++; continue; }
    src = src.replace(from, () => to); changed = true; console.log(`done ${file}: ${label}`);
  }
  if (changed) fs.writeFileSync(file, crlf ? src.replace(/\n/g, "\r\n") : src);
}

// 1. Database
patch("prisma/schema.prisma", [
  {
    label: "order delivery fields", done: "deliveryPhotoPath",
    from: "  giftName               String?\n",
    to: `  riderId                String?
  rider                  AdminUser?           @relation("OrderRider", fields: [riderId], references: [id])
  deliveredAt            DateTime?
  deliveryPhotoPath      String?
  coldChainOk            Boolean?
  deliveryNote           String?
  complaints             Complaint[]
  giftName               String?
`,
  },
  { label: "rider link", done: "deliveries   Order[]", from: "  lastLoginAt  DateTime?\n  createdAt    DateTime  @default(now())\n}", to: '  lastLoginAt  DateTime?\n  createdAt    DateTime  @default(now())\n  deliveries   Order[]   @relation("OrderRider")\n}' },
  { label: "product cost", done: "  costKobo    Int? //", from: "  isAddOn     Boolean     @default(false) // ponmo, plantain and other extras\n", to: "  isAddOn     Boolean     @default(false) // ponmo, plantain and other extras\n  costKobo    Int? // what one unit costs you, kobo. Empty = not set\n" },
  {
    label: "new models", done: "model Complaint {",
    from: "model FunnelEvent {",
    to: `enum ComplaintStatus {
  OPEN
  RESOLVED
}

model Complaint {
  id             String          @id @default(cuid())
  orderId        String
  order          Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  kind           String
  message        String
  status         ComplaintStatus @default(OPEN)
  resolution     String?
  resolutionNote String?
  resolvedAt     DateTime?
  resolvedBy     String?
  createdAt      DateTime        @default(now())

  @@index([status, createdAt])
  @@index([orderId])
}

model AuditLog {
  id        String   @id @default(cuid())
  adminId   String?
  adminName String
  action    String
  target    String
  detail    String?
  createdAt DateTime @default(now())

  @@index([createdAt])
}

model AdSpend {
  id         String   @id @default(cuid())
  day        String // YYYY-MM-DD, Lagos date
  source     String
  amountKobo Int
  note       String?
  createdAt  DateTime @default(now())

  @@index([day, source])
}

model FunnelEvent {`,
  },
]);

// 2. Order actions: delivery time and activity log
patch("app/admin/(panel)/orders/actions.ts", [
  { label: "import", done: 'from "@/lib/audit"', from: 'import { notifyOrderStatus } from "@/lib/notify";\n', to: 'import { notifyOrderStatus } from "@/lib/notify";\nimport { audit } from "@/lib/audit";\n' },
  {
    label: "record delivery time and log", done: "deliveredAt: new Date()",
    from: "  const r = await db.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: to } });\n  if (r.count > 0) await notifyOrderStatus(order, to);",
    to: '  const r = await db.order.updateMany({ where: { id: order.id, status: order.status }, data: to === "DELIVERED" ? { status: to, deliveredAt: new Date() } : { status: to } });\n  if (r.count > 0) {\n    await notifyOrderStatus(order, to);\n    await audit(admin, `Moved to ${to}`, reference);\n  }',
  },
  { label: "cancel admin", done: "const admin = await requireAdmin(MANAGERS);", from: '  await requireAdmin(MANAGERS);\n  const reference = str(fd, "reference");', to: '  const admin = await requireAdmin(MANAGERS);\n  const reference = str(fd, "reference");' },
  { label: "cancel log", done: 'audit(admin, "Cancelled order"', from: "    }\n  });\n  redirect(back);\n}", to: '    }\n  });\n  await audit(admin, "Cancelled order", reference, order.status);\n  redirect(back);\n}' },
]);

// 3. Admin order page: rider, proof of delivery, complaints
patch("app/admin/(panel)/orders/[reference]/page.tsx", [
  { label: "import", done: "OrderOps", from: 'import { advanceOrder, cancelOrder } from "../actions";\n', to: 'import { advanceOrder, cancelOrder } from "../actions";\nimport OrderOps from "@/components/admin/OrderOps";\n' },
  { label: "delivery form replaces plain button", done: 'advance && order.status !== "OUT_FOR_DELIVERY" && (', from: "        {advance && (\n          <form action={advanceOrder}>", to: '        {advance && order.status !== "OUT_FOR_DELIVERY" && (\n          <form action={advanceOrder}>' },
  {
    label: "delivery section", done: "<OrderOps",
    from: '          <section className={`${card} p-5 print:hidden`}>\n            <h2 className="mb-3 font-serif text-xl">Payment</h2>',
    to: '          <OrderOps reference={order.reference} role={admin.role} adminId={admin.id} />\n\n          <section className={`${card} p-5 print:hidden`}>\n            <h2 className="mb-3 font-serif text-xl">Payment</h2>',
  },
]);

// 4. Orders board: filter by area and rider, show the rider
patch("app/admin/(panel)/orders/page.tsx", [
  { label: "params type", done: "rider?: string; zone?: string", from: "searchParams: Promise<{ status?: string; date?: string; q?: string }>;", to: "searchParams: Promise<{ status?: string; date?: string; q?: string; rider?: string; zone?: string }>;" },
  { label: "params", done: "const { status, date, q, zone, rider }", from: "const { status, date, q } = await searchParams;", to: "const { status, date, q, zone, rider } = await searchParams;" },
  { label: "where", done: 'where.riderId = rider === "none"', from: "  if (date && /^\\d{4}-\\d{2}-\\d{2}$/.test(date)) where.deliveryDate = date;\n", to: '  if (date && /^\\d{4}-\\d{2}-\\d{2}$/.test(date)) where.deliveryDate = date;\n  if (zone) where.zoneId = zone;\n  if (rider) where.riderId = rider === "none" ? null : rider;\n' },
  { label: "include rider", done: "rider: { select: { name: true } }", from: "include: { zone: true, slot: true, items: { select: { quantity: true } } },", to: "include: { zone: true, slot: true, rider: { select: { name: true } }, items: { select: { quantity: true } } }," },
  {
    label: "filter lists", done: "const [zones, riders]",
    from: "  const keep = (extra: Record<string, string | undefined>) => {",
    to: '  const [zones, riders] = await Promise.all([\n    db.deliveryZone.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),\n    db.adminUser.findMany({ where: { role: "RIDER", active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),\n  ]);\n\n  const keep = (extra: Record<string, string | undefined>) => {',
  },
  { label: "keep", done: "{ status, date, q, zone, rider, ...extra }", from: "const merged = { status, date, q, ...extra };", to: "const merged = { status, date, q, zone, rider, ...extra };" },
  {
    label: "filter form", done: 'name="zone"',
    from: '        <button type="submit" className={btn}>Filter</button>',
    to: '        <select name="zone" defaultValue={zone ?? ""} className={`${input} max-w-[11rem]`} title="Area"><option value="">All areas</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}</select>\n        <select name="rider" defaultValue={rider ?? ""} className={`${input} max-w-[11rem]`} title="Rider"><option value="">All riders</option><option value="none">No rider yet</option>{riders.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>\n        <button type="submit" className={btn}>Filter</button>',
  },
  { label: "clear", done: "(q || date || zone || rider)", from: "{(q || date) && <Link href={keep({ q: undefined, date: undefined })}", to: "{(q || date || zone || rider) && <Link href={keep({ q: undefined, date: undefined, zone: undefined, rider: undefined })}" },
  { label: "empty hint", done: "status || q || date || zone || rider", from: "status || q || date ?", to: "status || q || date || zone || rider ?" },
  { label: "rider heading", done: "<th className={th}>Rider</th>", from: "                <th className={th}>Status</th>", to: "                <th className={th}>Status</th>\n                <th className={th}>Rider</th>" },
  { label: "rider cell", done: "o.rider?.name", from: "                  <td className={td}><StatusBadge status={o.status} /></td>", to: '                  <td className={td}><StatusBadge status={o.status} /></td>\n                  <td className={`${td} text-sm text-[#9A9585]`}>{o.rider?.name ?? "-"}</td>' },
]);

// 5. Customer order page: report a problem
patch("app/(site)/order/[reference]/page.tsx", [
  {
    label: "report link", done: "/problem/",
    from: '{order.status === "DELIVERED" && <Link href={`/review/${order.reference}`} className="button button-gold">Rate your order</Link>}',
    to: '{order.status === "DELIVERED" && <Link href={`/review/${order.reference}`} className="button button-gold">Rate your order</Link>}\n        {order.status === "DELIVERED" && <Link href={`/problem/${order.reference}`} className="text-link">Report a problem</Link>}',
  },
]);

// 6. Admin menu
patch("app/admin/(panel)/layout.tsx", [
  {
    label: "menu", done: "/admin/complaints",
    from: '  { href: "/admin/reviews", label: "Reviews", roles: MGR },\n',
    to: `  { href: "/admin/reviews", label: "Reviews", roles: MGR },
  { href: "/admin/rider", label: "Rider deliveries", roles: ["OWNER", "MANAGER", "RIDER"] },
  { href: "/admin/complaints", label: "Complaints", roles: MGR },
  { href: "/admin/abandoned", label: "Unpaid orders", roles: MGR },
  { href: "/admin/margins", label: "Cost and margin", roles: MGR },
  { href: "/admin/scorecard", label: "Ad scorecard", roles: MGR },
  { href: "/admin/audit", label: "Activity log", roles: ["OWNER"] },
`,
  },
]);

console.log(problems ? `\n${problems} step(s) were skipped. Send me the SKIP lines.` : "\nAll done.");
