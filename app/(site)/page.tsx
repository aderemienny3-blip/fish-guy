import { StorefrontHome } from "@/components/shop/storefront-home";
import { getSoundsPageData } from "@/lib/music/data";
import { getShopData } from "@/lib/shop/data";
import { liveCampaigns } from "@/lib/ads/data";
import { getStudentRules } from "@/lib/student";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sponsored = (await liveCampaigns("FEATURED_STRIP"))[0] ?? null;
  const [shop, sounds, student] = await Promise.all([getShopData(), getSoundsPageData(), getStudentRules()]);
  const freeTracks = sounds.tracks.filter((t) => t.isFreeToStream && t.canPlay).slice(0, 3);
  return <StorefrontHome sponsored={sponsored} products={shop.products} categories={shop.categories} freeTracks={freeTracks} studentPercent={student.percent} />;
}
