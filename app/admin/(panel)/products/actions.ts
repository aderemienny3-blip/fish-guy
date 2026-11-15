"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, isUniqueError, nairaToKobo, slugify, str } from "@/lib/admin/format";

export async function saveProduct(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const back = id ? `/admin/products/${id}` : "/admin/products/new";

  const name = str(fd, "name");
  const slug = slugify(str(fd, "slug") || name);
  const priceKobo = nairaToKobo(str(fd, "price"));
  const stockQty = Number(str(fd, "stockQty") || "0");
  const packRaw = str(fd, "packSizeG");
  const packSizeG = packRaw ? Number(packRaw) : null;
  const imageUrl = str(fd, "imageUrl");

  if (name.length < 2) bail(back, "Enter a product name.");
  if (!slug) bail(back, "The web address (slug) can't be empty.");
  if (priceKobo === null || priceKobo <= 0) bail(back, "Enter a price in naira greater than zero.");
  if (!Number.isInteger(stockQty) || stockQty < 0) bail(back, "Stock must be a whole number, 0 or more.");
  if (packSizeG !== null && (!Number.isInteger(packSizeG) || packSizeG <= 0)) {
    bail(back, "Pack size must be a whole number of grams.");
  }
  if (imageUrl && !/^https:\/\//i.test(imageUrl)) bail(back, "Image link must start with https://");

  const data = {
    name,
    slug,
    description: str(fd, "description") || null,
    category: str(fd, "category") || null,
    imageUrl: imageUrl || null,
    priceKobo,
    unit: str(fd, "unit") || "kg",
    packSizeG,
    stockQty,
    active: fd.get("active") === "on",
  };

  try {
    if (id) await db.product.update({ where: { id }, data });
    else await db.product.create({ data });
  } catch (e) {
    if (isUniqueError(e)) bail(back, "Another product already uses that web address. Change the slug.");
    throw e;
  }
  redirect("/admin/products?saved=1");
}

export async function setStock(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const stock = Number(str(fd, "stock"));
  if (!id || !Number.isInteger(stock) || stock < 0) bail("/admin/products", "Stock must be a whole number, 0 or more.");
  await db.product.update({ where: { id }, data: { stockQty: stock } });
  redirect("/admin/products?saved=1");
}

export async function toggleProduct(fd: FormData) {
  await requireAdmin(MANAGERS);
  const id = str(fd, "id");
  const product = await db.product.findUnique({ where: { id } });
  if (product) await db.product.update({ where: { id }, data: { active: !product.active } });
  redirect("/admin/products");
}
