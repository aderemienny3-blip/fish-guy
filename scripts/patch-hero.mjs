// Makes the home page picture editable and lets artists book it as an ad.
// REQUIRES the Fish Guy Ads kit to be installed first. Safe to run more than once.
// Run in the project folder:  node scripts/patch-hero.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

let problems = 0;
function patch(file, steps) {
  if (!existsSync(file)) { console.log(`MISSING  ${file}`); problems++; return; }
  let s = readFileSync(file, "utf8");
  const crlf = s.includes("\r\n");
  if (crlf) s = s.replace(/\r\n/g, "\n");
  let changed = 0;
  for (const st of steps) {
    if (s.includes(st.done)) continue;
    if (!s.includes(st.find)) { console.log(`CANNOT PATCH  ${file}  (could not find: ${st.find.split("\n")[0].trim()})`); problems++; continue; }
    s = s.replace(st.find, st.replace);
    changed++;
  }
  if (changed) writeFileSync(file, crlf ? s.replace(/\n/g, "\r\n") : s);
  console.log(`${changed ? "patched " : "ok      "} ${file}`);
}

patch("prisma/schema.prisma", [
  { done: "HERO_BANNER", find: "  FEATURED_STRIP\n", replace: "  FEATURED_STRIP\n  HERO_BANNER\n" },
  { done: "heroImageUrl", find: "  studentValidityDays    Int      @default(365)\n", replace: "  studentValidityDays    Int      @default(365)\n  heroImageUrl           String?\n  heroCaption            String?\n  heroAlt                String?\n" },
]);
patch("app/admin/(panel)/layout.tsx", [
  { done: '"/admin/homepage"', find: '  { href: "/admin/ads"', replace: '  { href: "/admin/homepage", label: "Homepage", roles: MGR },\n  { href: "/admin/ads"' },
]);
patch("app/(site)/layout.tsx", [
  { done: 'import "./hero.css"', find: 'import "./ads.css";', replace: 'import "./ads.css";\nimport "./hero.css";' },
]);
patch("components/shop/storefront-home.tsx", [
  { done: "HomeHeroArt", find: 'import type { AdView } from "@/lib/ads/data";', replace: 'import type { AdView } from "@/lib/ads/data";\nimport { HomeHeroArt } from "@/components/shop/home-hero-art";\nimport { DEFAULT_HERO, type Hero } from "@/lib/site-hero";' },
  { done: "hero = DEFAULT_HERO", find: "  sponsored = null,\n", replace: "  sponsored = null,\n  hero = DEFAULT_HERO,\n  heroAd = null,\n" },
  { done: "hero?: Hero", find: "  sponsored?: AdView | null;\n", replace: "  sponsored?: AdView | null;\n  hero?: Hero;\n  heroAd?: AdView | null;\n" },
  {
    done: "<HomeHeroArt",
    find: '          <Image src="/frozen-food-hero.png" alt="Vacuum-sealed frozen fish and prawns on crushed ice" fill priority sizes="(max-width: 680px) 100vw, 54vw" />\n          <span className="hero-art-caption">FROZEN WITH CARE · LAGOS</span>',
    replace: "          <HomeHeroArt hero={hero} ad={heroAd} />",
  },
]);
patch("app/(site)/page.tsx", [
  { done: "getHero", find: 'import { liveCampaigns } from "@/lib/ads/data";', replace: 'import { liveCampaigns } from "@/lib/ads/data";\nimport { getHero } from "@/lib/site-hero";' },
  { done: 'liveCampaigns("HERO_BANNER")', find: '  const sponsored = (await liveCampaigns("FEATURED_STRIP"))[0] ?? null;\n', replace: '  const sponsored = (await liveCampaigns("FEATURED_STRIP"))[0] ?? null;\n  const [hero, heroAds] = await Promise.all([getHero(), liveCampaigns("HERO_BANNER")]);\n  const heroAd = heroAds.length ? heroAds[Math.floor(Math.random() * heroAds.length)] : null;\n' },
  { done: "heroAd={heroAd}", find: "<StorefrontHome sponsored={sponsored} ", replace: "<StorefrontHome hero={hero} heroAd={heroAd} sponsored={sponsored} " },
]);

// Tidy: the home page no longer uses next/image directly.
{
  const f = "components/shop/storefront-home.tsx";
  let s = readFileSync(f, "utf8");
  if (s.includes('import Image from "next/image";') && !s.includes("<Image")) {
    s = s.replace(/import Image from "next\/image";\r?\n/, "");
    writeFileSync(f, s);
    console.log("tidied   " + f);
  }
}

if (problems) { console.log(`\n${problems} problem(s). Send me this output and I will fix it.`); process.exit(1); }
console.log("\nAll done.");
