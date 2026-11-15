import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import ProductFields from "@/components/admin/ProductFields";
import { Banner, PageHeader, card } from "@/components/admin/ui";
import { saveProduct } from "../actions";

export default async function EditProduct({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin(MANAGERS);
  const { id } = await params;
  const { error } = await searchParams;
  const product = await db.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <>
      <PageHeader title={product.name} subtitle="Edit product" />
      {error && <Banner>{error}</Banner>}
      <form action={saveProduct} className={`${card} max-w-3xl p-6`}>
        <ProductFields product={product} />
      </form>
    </>
  );
}
