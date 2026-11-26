import { db } from "@/lib/db";
import { getCustomer } from "@/lib/customer";
import type { Prefill } from "@/lib/checkout-saved";

const local = (p: string | null | undefined) => (p && p.startsWith("234") && p.length === 13 ? "0" + p.slice(3) : p ?? "");

/** For a signed-in customer: their details plus the address and area from their last delivered-type order. */
export async function getCheckoutPrefill(): Promise<Prefill | null> {
  try {
    const c = await getCustomer();
    if (!c) return null;
    const or = [{ customerId: c.id }, ...(c.phone ? [{ contactPhone: c.phone }] : [])];
    const last = await db.order.findFirst({
      where: { OR: or, status: { in: ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"] }, zone: { isPickup: false } },
      orderBy: { createdAt: "desc" },
      select: { contactName: true, contactEmail: true, contactPhone: true, addressLine: true, landmark: true, zoneId: true },
    });
    return {
      name: c.name ?? last?.contactName ?? "",
      phone: local(c.phone) || local(last?.contactPhone),
      email: c.email ?? last?.contactEmail ?? "",
      addressLine: last?.addressLine ?? "",
      landmark: last?.landmark ?? "",
      zoneId: last?.zoneId ?? "",
    };
  } catch {
    return null;
  }
}
