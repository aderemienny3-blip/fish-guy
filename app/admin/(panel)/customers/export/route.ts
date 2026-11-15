import { getAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { SEGMENTS, SEGMENT_LABEL, getCustomers, type Segment } from "@/lib/admin/segments";

// Stops spreadsheet programs from running text like =HYPERLINK(...) as a formula.
function cell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: Request) {
  const admin = await getAdmin();
  if (!admin || (admin.role !== "OWNER" && admin.role !== "MANAGER")) {
    return new Response("Not allowed", { status: 401 });
  }

  const segParam = new URL(req.url).searchParams.get("segment");
  const seg = SEGMENTS.includes(segParam as Segment) ? (segParam as Segment) : null;

  const customers = (await getCustomers(await getSettings())).filter((c) => !seg || c.segment === seg);

  const header = ["Name", "Phone", "Email", "Segment", "Paid orders", "Total spend (NGN)", "First order", "Last order"];
  const lines = [header.map(cell).join(",")];
  for (const c of customers) {
    lines.push(
      [
        c.name,
        c.phone,
        c.email,
        SEGMENT_LABEL[c.segment],
        c.orders,
        (c.spendKobo / 100).toFixed(2),
        c.firstAt.toISOString().slice(0, 10),
        c.lastAt.toISOString().slice(0, 10),
      ]
        .map(cell)
        .join(",")
    );
  }

  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fish-guy-customers.csv"',
      "Cache-Control": "no-store",
    },
  });
}
