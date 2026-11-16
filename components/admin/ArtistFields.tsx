import { btn, input, label } from "@/components/admin/ui";

type A = { id?: string; name?: string; bio?: string | null; email?: string | null; imageUrl?: string | null; bannerUrl?: string | null; isFeatured?: boolean };

export default function ArtistFields({ a = {} }: { a?: A }) {
  return (
    <div className="space-y-4">
      {a.id && <input type="hidden" name="id" value={a.id} />}
      <div><label className={label}>Artist name</label><input name="name" defaultValue={a.name ?? ""} className={input} required /></div>
      <div><label className={label}>Bio</label><textarea name="bio" defaultValue={a.bio ?? ""} rows={4} className={input} /></div>
      <div><label className={label}>Contact email (private)</label><input name="email" type="email" defaultValue={a.email ?? ""} className={input} /></div>
      <div><label className={label}>Photo link (https://)</label><input name="imageUrl" defaultValue={a.imageUrl ?? ""} className={input} placeholder="https://" /></div>
      <div><label className={label}>Banner link (https://)</label><input name="bannerUrl" defaultValue={a.bannerUrl ?? ""} className={input} placeholder="https://" /></div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={a.isFeatured} /> Artist of the week (shown on the Sounds home page)</label>
      <button type="submit" className={btn}>Save artist</button>
    </div>
  );
}
