import { NextResponse } from "next/server";
import { GET as expireOrders } from "../expire-orders/route";
import { runReorderReminders, runUnpaidReminders } from "@/lib/reminders";

// One scheduled call does all the timed jobs. Call it every 5 minutes with: Authorization: Bearer $CRON_SECRET
// 1) release unpaid orders, 2) remind people who have not paid yet, 3) nudge customers who agreed to reorder reminders.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const out: Record<string, unknown> = {};
  try { out.expire = await (await expireOrders(req)).json(); } catch (e) { out.expire = { error: String(e) }; }
  try { out.unpaid = await runUnpaidReminders(); } catch (e) { out.unpaid = { error: String(e) }; }
  try { out.reorder = await runReorderReminders(); } catch (e) { out.reorder = { error: String(e) }; }
  return NextResponse.json(out);
}
