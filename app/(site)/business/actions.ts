"use server";

import { db } from "@/lib/db";
import { getCustomer } from "@/lib/customer";

const MAX_LINES = 100;
const MAX_QTY = 200;

/** Replaces the signed-in customer's regular list. */
export async function saveRegulars(items: { productId: string; quantity: number }[]): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const c = await getCustomer();
  if (!c) return { ok: false, error: "Sign in to your account to save a regular list." };
  if (!Array.isArray(items) || items.length > MAX_LINES) return { ok: false, error: "That list is too long." };
  const clean = new Map<string, number>();
  for (const i of items) {
    const q = Math.floor(Number(i?.quantity));
    if (typeof i?.productId === "string" && q >= 1 && q <= MAX_QTY) clean.set(i.productId, q);
  }
  const live = await db.product.findMany({ where: { id: { in: [...clean.keys()] }, active: true }, select: { id: true } });
  const rows = live.map((p) => ({ customerId: c.id, productId: p.id, quantity: clean.get(p.id)! }));
  await db.$transaction([db.regularItem.deleteMany({ where: { customerId: c.id } }), db.regularItem.createMany({ data: rows })]);
  return { ok: true, count: rows.length };
}
