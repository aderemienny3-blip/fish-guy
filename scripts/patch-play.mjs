// Puts a Play button everywhere and makes the player bar always visible. Safe to run more than once.
// Run in the project folder:  node scripts/patch-play.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";

let problems = 0;
function patch(file, steps, { optional = false } = {}) {
  if (!existsSync(file)) { if (!optional) { console.log(`MISSING  ${file}`); problems++; } return; }
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

// Header Play button
patch("components/music/site-shell.tsx", [
  { done: "PlayMusicButton", find: "import { CartDrawer } from '@/components/shop/cart-drawer'", replace: "import { CartDrawer } from '@/components/shop/cart-drawer'\nimport { PlayMusicButton } from '@/components/music/play-music-button'" },
  { done: '<PlayMusicButton variant="header" />', find: "        <CartDrawer />", replace: '        <PlayMusicButton variant="header" />\n        <CartDrawer />' },
]);

// Home page Play button beside Order now
patch("components/shop/storefront-home.tsx", [
  { done: "PlayMusicButton", find: 'import { ShopEmptyState } from "@/components/shop/shop-empty-state";', replace: 'import { ShopEmptyState } from "@/components/shop/shop-empty-state";\nimport { PlayMusicButton } from "@/components/music/play-music-button";' },
  {
    done: "hero-cta-row",
    find: '          <Link href="/shop" className="button button-gold">Order now <ArrowRight aria-hidden="true" /></Link>',
    replace: '          <div className="hero-cta-row">\n            <Link href="/shop" className="button button-gold">Order now <ArrowRight aria-hidden="true" /></Link>\n            <PlayMusicButton variant="hero" />\n          </div>',
  },
]);

// Styles
patch("app/(site)/layout.tsx", [
  { done: 'import "./music-play.css"', find: 'import "./site.css";', replace: 'import "./site.css";\nimport "./music-play.css";' },
]);

// Hand-made shop playlist first, when the playlists kit is installed
patch("app/api/music/queue/route.ts", existsSync("lib/music/playlists.ts") ? [
  { done: "getShopPlaylistTracks", find: 'import { getSoundsPageData } from "@/lib/music/data";', replace: 'import { getSoundsPageData } from "@/lib/music/data";\nimport { getShopPlaylistTracks } from "@/lib/music/playlists";' },
  { done: "const curated", find: "  // SHOP_PLAYLIST_HOOK\n", replace: "  const curated = await getShopPlaylistTracks();\n  if (curated.length) return NextResponse.json({ tracks: curated }, { headers: { \"Cache-Control\": \"no-store\" } });\n" },
] : []);

// Promoted songs play in the site player (only when the ads kit is installed)
if (existsSync("lib/ads/data.ts")) {
  patch("lib/ads/data.ts", [
    { done: "trackId?: string | null", find: "  imageSrc: string | null;\n};", replace: "  imageSrc: string | null;\n  trackId?: string | null;\n};" },
    { done: "trackId: s ?", find: "imageSrc: adImageSrc(r.imagePath) });", replace: "imageSrc: adImageSrc(r.imagePath), trackId: s ? r.trackId : null });" },
  ]);
  patch("components/ads/ad-popup.tsx", [
    { done: "AdPlay", find: 'import { recordAd } from "@/lib/ads/client";', replace: 'import { recordAd } from "@/lib/ads/client";\nimport { AdPlay } from "@/components/ads/ad-play";' },
    { done: "<AdPlay", find: '        <a className="button button-gold" href={ad.href}', replace: '        {ad.trackId && <AdPlay trackId={ad.trackId} adId={ad.id} />}\n        <a className={ad.trackId ? "button button-outline" : "button button-gold"} href={ad.href}' },
    { done: "Track page", find: ">Listen now</a>", replace: ">{ad.trackId ? \"Track page\" : \"Listen now\"}</a>" },
  ]);
} else {
  console.log("(ads kit not installed: skipping promoted-song play button)");
}

if (problems) { console.log(`\n${problems} problem(s). Send me this output and I will fix it.`); process.exit(1); }
console.log("\nAll done.");
