import Image from "next/image";
import type { AdView } from "@/lib/ads/data";
import type { Hero } from "@/lib/site-hero";
import { HeroAdArt } from "@/components/ads/hero-ad-art";

export function HomeHeroArt({ hero, ad }: { hero: Hero; ad: AdView | null }) {
  if (ad && ad.imageSrc) return <HeroAdArt ad={ad} />;
  return (
    <>
      <Image src={hero.imageUrl ?? "/frozen-food-hero.png"} alt={hero.alt} fill priority sizes="(max-width: 680px) 100vw, 54vw" unoptimized={!!hero.imageUrl} />
      <span className="hero-art-caption">{hero.caption}</span>
    </>
  );
}
