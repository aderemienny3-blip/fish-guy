import type { Product } from "@prisma/client";
import { koboToInput } from "@/lib/admin/format";
import { btn, input, label } from "./ui";

export default function ProductFields({ product }: { product?: Product }) {
  return (
    <div className="space-y-5">
      {product && <input type="hidden" name="id" value={product.id} />}

      <div>
        <label className={label} htmlFor="name">Product name</label>
        <input id="name" name="name" required defaultValue={product?.name} className={input} placeholder="e.g. Croaker fish (whole)" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="category">Category</label>
          <input id="category" name="category" defaultValue={product?.category ?? ""} className={input} placeholder="Fish, Chicken, Turkey..." />
        </div>
        <div>
          <label className={label} htmlFor="slug">Web address (slug)</label>
          <input id="slug" name="slug" defaultValue={product?.slug} className={input} placeholder="Leave blank to create from the name" />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} defaultValue={product?.description ?? ""} className={input} />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className={label} htmlFor="price">Price (₦)</label>
          <input id="price" name="price" inputMode="decimal" required defaultValue={product ? koboToInput(product.priceKobo) : ""} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="unit">Sold per</label>
          <input id="unit" name="unit" defaultValue={product?.unit ?? "kg"} className={input} placeholder="kg, pack, piece" />
        </div>
        <div>
          <label className={label} htmlFor="packSizeG">Pack size (grams)</label>
          <input id="packSizeG" name="packSizeG" inputMode="numeric" defaultValue={product?.packSizeG ?? ""} className={input} placeholder="optional" />
        </div>
        <div>
          <label className={label} htmlFor="stockQty">In stock</label>
          <input id="stockQty" name="stockQty" inputMode="numeric" required defaultValue={product?.stockQty ?? 0} className={input} />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="imageUrl">Photo link</label>
        <input id="imageUrl" name="imageUrl" defaultValue={product?.imageUrl ?? ""} className={input} placeholder="https://..." />
        <p className="mt-1 text-xs text-[#9A9585]">Paste a link to the photo for now. Direct photo upload comes later.</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={product ? product.active : true} className="h-4 w-4 accent-[#D4AF37]" />
        Visible in the shop
      </label>

      <button type="submit" className={btn}>{product ? "Save changes" : "Add product"}</button>
    </div>
  );
}
