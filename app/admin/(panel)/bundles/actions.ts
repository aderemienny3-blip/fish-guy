"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, nairaToKobo, slugify, str } from "@/lib/admin/format";
import { formatNaira } from "@/lib/money";

const BACK = "/admin/bundles";

export async function saveBundle(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const name = str(fd, "name");
  const description = str(fd, "description").slice(0, 200);
  const priceKobo = nairaToKobo(str(fd, "price"));
  const active = fd.get("active") === "on";
  if (name.length < 2 || name.length > 60) bail(BACK, "Give the bundle a name of 2 to 60 characters.");
  if (priceKobo === null || priceKobo < 100) bail(BACK, "Enter the bundle price in naira.");

  const wanted = new Map<string, number>();
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("q-")) continue;
    const q = Math.floor(Number(v));
    if (q >= 1 && q <= 50) wanted.set(k.slice(2), q);
  }
  if (wanted.size === 0) bail(BACK, "Pick at least one product for the bundle.");
  const products = await db.product.findMany({ where: { id: { in: [...wanted.keys()] } }, select: { id: true, priceKobo: true } });
  if (products.length !== wanted.size) bail(BACK, "One of the chosen products no longer exists.");
  const retail = products.reduce((n, p) => n + p.priceKobo * wanted.get(p.id)!, 0);
  if (priceKobo >= retail) bail(BACK, `The items cost ${formatNaira(retail)} bought separately. Set the bundle price lower so customers actually save.`);

  const items = [...wanted.entries()].map(([productId, quantity]) => ({ productId, quantity }));
  if (id) {
    const found = await db.bundle.findUnique({ where: { id }, select: { id: true } });
    if (!found) bail(BACK, "That bundle was not found.");
    await db.$transaction([
      db.bundleItem.deleteMany({ where: { bundleId: id } }),
      db.bundle.update({ where: { id }, data: { name, description: description || null, priceKobo, active, items: { create: items } } }),
    ]);
  } else {
    let slug = slugify(name) || "bundle";
    if (await db.bundle.findUnique({ where: { slug } })) slug += "-" + Math.random().toString(36).slice(2, 6);
    await db.bundle.create({ data: { slug, name, description: description || null, priceKobo, active, items: { create: items } } });
  }
  redirect(`${BACK}?saved=1`);
}

export async function deleteBundle(fd: FormData) {
  await requireAdmin(MANAGERS);
  await db.bundle.deleteMany({ where: { id: str(fd, "id") } });
  redirect(`${BACK}?saved=1`);
}
