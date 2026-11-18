import type { Metadata, Viewport } from "next";
import { MiniPlayer, MusicPlayerProvider } from "@/components/music/music-player";
import { SiteFooter, SiteHeader } from "@/components/music/site-shell";
import { CartProvider } from "@/components/shop/cart";
import { AdPopup } from "@/components/ads/ad-popup";
import "./ads.css";
import "./hero.css";
import { PwaBoot } from "@/components/shop/pwa";
import "./site.css";
import "./addons.css";
import "./music-play.css";
import "./playlists.css";

export const metadata: Metadata = {
  title: "Fish Guy | Frozen Food Delivery in Lagos",
  description: "Frozen fish, turkey and chicken delivered across Lagos. Listen to independent music from Fish Guy Sounds while you shop.",
  applicationName: "Fish Guy",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Fish Guy", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#0A0A0A" };

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-root">
      <CartProvider>
        <MusicPlayerProvider>
          <div className="site-shell">
            <SiteHeader />
            {children}
            <SiteFooter />
          </div>
          <MiniPlayer />
          <AdPopup />
          <PwaBoot />
        </MusicPlayerProvider>
      </CartProvider>
    </div>
  );
}
