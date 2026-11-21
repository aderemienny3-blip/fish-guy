import { btn, input, label } from "@/components/admin/ui";
import ProductPhotoField from "@/components/admin/ProductPhotoField";

type A = { id?: string; name?: string; bio?: string | null; email?: string | null; imageUrl?: string | null; bannerUrl?: string | null; isFeatured?: boolean };

export default function ArtistFields({ a = {} }: { a?: A }) {
  return (
    <div className="space-y-5">
      {a.id && <input type="hidden" name="id" value={a.id} />}
      <div><label className={label}>Artist name</label><input name="name" defaultValue={a.name ?? ""} className={input} required /></div>
      <div><label className={label}>Bio</label><textarea name="bio" defaultValue={a.bio ?? ""} rows={4} className={input} /></div>
      <div><label className={label}>Artist login email (they sign in to their dashboard with a code sent here)</label><input name="email" type="email" defaultValue={a.email ?? ""} className={input} /></div>
      <ProductPhotoField initial={a.imageUrl ?? ""} title="Artist photo" name="imageUrl" />
      <ProductPhotoField initial={a.bannerUrl ?? ""} title="Banner (wide picture behind the name, optional)" name="bannerUrl" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={a.isFeatured} /> Artist of the week (shown on the Sounds home page)</label>
      <button type="submit" className={btn}>Save artist</button>
    </div>
  );
}
