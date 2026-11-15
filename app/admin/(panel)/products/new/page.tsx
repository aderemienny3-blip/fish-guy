import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import ProductFields from "@/components/admin/ProductFields";
import { Banner, PageHeader, card } from "@/components/admin/ui";
import { saveProduct } from "../actions";

export default async function NewProduct({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin(MANAGERS);
  const { error } = await searchParams;
  return (
    <>
      <PageHeader title="Add product" />
      {error && <Banner>{error}</Banner>}
      <form action={saveProduct} className={`${card} max-w-3xl p-6`}>
        <ProductFields />
      </form>
    </>
  );
}
