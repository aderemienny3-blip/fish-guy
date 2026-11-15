import type { StoreSettings } from "@prisma/client";
import { db } from "@/lib/db";
import { daysSince } from "./format";
import { PAID_STATUSES } from "./orders";

export type Segment = "SUPER_BUYER" | "LOYAL" | "NEW" | "AT_RISK" | "LOST" | "REGULAR";

export const SEGMENTS: Segment[] = ["SUPER_BUYER", "LOYAL", "NEW", "REGULAR", "AT_RISK", "LOST"];

export const SEGMENT_LABEL: Record<Segment, string> = {
  SUPER_BUYER: "Super Buyers",
  LOYAL: "Loyal",
  NEW: "New",
  REGULAR: "Regular",
  AT_RISK: "At risk",
  LOST: "Lost",
};

export type CustomerRow = {
  phone: string;
  name: string;
  email: string;
  orders: number;
  spendKobo: number;
  firstAt: Date;
  lastAt: Date;
  recentOrders: number;
  segment: Segment;
};

type Stats = Pick<CustomerRow, "orders" | "spendKobo" | "firstAt" | "lastAt" | "recentOrders">;

/** Order of checks matters: a lapsed Super Buyer shows as At risk so you can win them back. */
export function classify(c: Stats, s: StoreSettings, now = new Date()): Segment {
  const sinceLast = daysSince(c.lastAt, now);
  if (sinceLast >= s.lostDays) return "LOST";
  if (sinceLast >= s.atRiskDays) return "AT_RISK";
  if (
    c.recentOrders >= s.superBuyerMinOrders ||
    (s.superBuyerMinSpendKobo > 0 && c.spendKobo >= s.superBuyerMinSpendKobo)
  ) {
    return "SUPER_BUYER";
  }
  if (c.orders >= s.loyalMinOrders) return "LOYAL";
  if (daysSince(c.firstAt, now) <= s.newCustomerDays) return "NEW";
  return "REGULAR";
}

/** Every customer with at least one paid order, grouped by phone number. */
export async function getCustomers(s: StoreSettings): Promise<CustomerRow[]> {
  const where = { status: { in: PAID_STATUSES } };
  const windowStart = new Date(Date.now() - s.superBuyerWindowDays * 86_400_000);

  const [all, recent, names] = await Promise.all([
    db.order.groupBy({
      by: ["contactPhone"],
      where,
      _count: { _all: true },
      _sum: { totalKobo: true },
      _min: { createdAt: true },
      _max: { createdAt: true },
    }),
    db.order.groupBy({
      by: ["contactPhone"],
      where: { ...where, createdAt: { gte: windowStart } },
      _count: { _all: true },
    }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      distinct: ["contactPhone"],
      select: { contactPhone: true, contactName: true, contactEmail: true },
    }),
  ]);

  const recentBy = new Map(recent.map((r) => [r.contactPhone, r._count._all]));
  const nameBy = new Map(names.map((n) => [n.contactPhone, n]));
  const now = new Date();

  return all
    .map((g) => {
      const stats: Stats = {
        orders: g._count._all,
        spendKobo: g._sum.totalKobo ?? 0,
        firstAt: g._min.createdAt ?? now,
        lastAt: g._max.createdAt ?? now,
        recentOrders: recentBy.get(g.contactPhone) ?? 0,
      };
      const n = nameBy.get(g.contactPhone);
      return {
        phone: g.contactPhone,
        name: n?.contactName ?? "",
        email: n?.contactEmail ?? "",
        ...stats,
        segment: classify(stats, s, now),
      };
    })
    .sort((a, b) => b.spendKobo - a.spendKobo);
}
