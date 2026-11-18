import Link from "next/link";
import { MANAGERS, requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/admin/settings";
import { Banner, PageHeader, btn, btnGhost, card, input, label } from "@/components/admin/ui";
import ProductPhotoField from "@/components/admin/ProductPhotoField";
import { DEFAULT_HERO } from "@/lib/site-hero";
import { saveHero } from "./actions";

export const dynamic = "force-dynamic";

export default async function HomepageAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireAdmin(MANAGERS);
  const { saved, error } = await searchParams;
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Homepage image" subtitle="The big picture next to “Good food, kept cold.” Use your own food photo, or feature an artist." actions={<Link href="/admin/ads" className={btnGhost}>Artist ads</Link>} />
      {saved && <Banner kind="ok">Saved. The home page now shows it.</Banner>}
      {error && <Banner>{error}</Banner>}
      <form action={saveHero} className={`${card} max-w-2xl space-y-5 p-5`}>
        <ProductPhotoField title="Homepage image" initial={s.heroImageUrl ?? ""} />
        <div>
          <label className={label} htmlFor="caption">Caption on the picture (max 40 characters)</label>
          <input id="caption" name="caption" defaultValue={s.heroCaption ?? ""} placeholder={DEFAULT_HERO.caption} maxLength={40} className={input} />
        </div>
        <div>
          <label className={label} htmlFor="alt">Describe the picture (for screen readers)</label>
          <input id="alt" name="alt" defaultValue={s.heroAlt ?? ""} placeholder={DEFAULT_HERO.alt} maxLength={120} className={input} />
        </div>
        <p className="text-xs text-[#9A9585]">Wide pictures (landscape, at least 1200 px across) look best. With no photo, the built-in frozen food photo is used. When an artist books a Homepage hero ad, their artwork replaces this picture on their paid days, labelled Sponsored, then yours returns.</p>
        <button className={btn}>Save</button>
      </form>
    </>
  );
}
