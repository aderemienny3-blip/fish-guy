import { getAdmin, MANAGERS } from "@/lib/admin/auth";
import { abandonedOrders } from "@/lib/abandoned";

const cell = (v: string | number) => {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stops spreadsheet formulas
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET() {
  const admin = await getAdmin();
  if (!admin || !MANAGERS.includes(admin.role)) return new Response("Not allowed", { status: 403 });
  const rows = await abandonedOrders(30);
  const head = ["Name", "Phone", "Email", "Items", "Value (NGN)", "Started", "Reference"];
  const body = rows.map((r) => [r.name, r.phone, r.email, r.items, r.totalKobo / 100, r.at.toISOString().slice(0, 16).replace("T", " "), r.reference].map(cell).join(","));
  return new Response([head.map(cell).join(","), ...body].join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="unpaid-orders.csv"' } });
}
