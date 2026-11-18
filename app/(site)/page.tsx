import { StorefrontHome } from "@/components/shop/storefront-home";
import { getSoundsPageData } from "@/lib/music/data";
import { getShopData } from "@/lib/shop/data";
import { liveCampaigns } from "@/lib/ads/data";
import { getHero } from "@/lib/site-hero";
import { getStudentRules } from "@/lib/student";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sponsored = (await liveCampaigns("FEATURED_STRIP"))[0] ?? null;
  const [hero, heroAds] = await Promise.all([getHero(), liveCampaigns("HERO_BANNER")]);
  const heroAd = heroAds.length ? heroAds[Math.floor(Math.random() * heroAds.length)] : null;
  const [shop, sounds, student] = await Promise.all([getShopData(), getSoundsPageData(), getStudentRules()]);
  const freeTracks = sounds.tracks.filter((t) => t.isFreeToStream && t.canPlay).slice(0, 3);
  return <StorefrontHome hero={hero} heroAd={heroAd} sponsored={sponsored} products={shop.products} categories={shop.categories} freeTracks={freeTracks} studentPercent={student.percent} />;
}
