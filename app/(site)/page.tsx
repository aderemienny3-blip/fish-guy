import { StorefrontHome } from "@/components/shop/storefront-home";
import { getSoundsPageData } from "@/lib/music/data";
import { getShopData } from "@/lib/shop/data";
import { getStudentRules } from "@/lib/student";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [shop, sounds, student] = await Promise.all([getShopData(), getSoundsPageData(), getStudentRules()]);
  const freeTracks = sounds.tracks.filter((t) => t.isFreeToStream && t.canPlay).slice(0, 3);
  return <StorefrontHome products={shop.products} categories={shop.categories} freeTracks={freeTracks} studentPercent={student.percent} />;
}
