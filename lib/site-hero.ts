import { db } from "@/lib/db";

export type Hero = { imageUrl: string | null; caption: string; alt: string };

export const DEFAULT_HERO: Hero = {
  imageUrl: null, // null = the built-in frozen food photo
  caption: "FROZEN WITH CARE · LAGOS",
  alt: "Vacuum-sealed frozen fish and prawns on crushed ice",
};

/** The editable home page picture. Falls back to the built-in photo and never throws. */
export async function getHero(): Promise<Hero> {
  try {
    const s = await db.storeSettings.findUnique({ where: { id: 1 }, select: { heroImageUrl: true, heroCaption: true, heroAlt: true } });
    if (!s) return DEFAULT_HERO;
    return {
      imageUrl: s.heroImageUrl,
      caption: s.heroCaption || DEFAULT_HERO.caption,
      alt: s.heroAlt || (s.heroImageUrl ? "Featured on Fish Guy" : DEFAULT_HERO.alt),
    };
  } catch (e) {
    console.error("getHero failed", e);
    return DEFAULT_HERO;
  }
}
