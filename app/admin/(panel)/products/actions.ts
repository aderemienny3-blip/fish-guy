"use server";

import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { bail, isUniqueError, nairaToKobo, slugify, str } from "@/lib/admin/format";

const PHOTO_URL = /^\/api\/shop\/photo\?p=products%2F[A-Za-z0-9._-]{1,150}$/;
const photoPath = (u: string | null) => (u && PHOTO_URL.test(u) ? decodeURIComponent(u.split("p=")[1]) : null);

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
  if (imageUrl && !/^https:\/\//i.test(imageUrl) && !PHOTO_URL.test(imageUrl)) bail(back, "That photo is not valid. Upload it again.");

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
    isAddOn: fd.get("isAddOn") === "on",
  };

  try {
    const before = id ? await db.product.findUnique({ where: { id }, select: { imageUrl: true } }) : null;
    if (id) await db.product.update({ where: { id }, data });
    else await db.product.create({ data });
    // Tidy up: delete the old uploaded photo if it was replaced or removed.
    const old = photoPath(before?.imageUrl ?? null);
    if (old && old !== photoPath(data.imageUrl)) { try { await del(old); } catch { /* ignore */ } }
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
