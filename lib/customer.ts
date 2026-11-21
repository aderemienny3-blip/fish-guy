import { cache } from "react";
import { auth } from "@/lib/customer-auth";
import { db } from "@/lib/db";

/** The signed-in customer, or null. */
export const getCustomer = cache(async () => {
  try {
    const session = await auth();
    const id = (session as unknown as { customerId?: string } | null)?.customerId;
    if (!id) return null;
    return await db.customer.findUnique({ where: { id } });
  } catch {
    return null;
  }
});
