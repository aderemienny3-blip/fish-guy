import type { Metadata, Viewport } from "next";
import { MiniPlayer, MusicPlayerProvider } from "@/components/music/music-player";
import { SiteFooter, SiteHeader } from "@/components/music/site-shell";
import { CartProvider } from "@/components/shop/cart";
import { FestivePopup, FestiveRibbon } from "@/components/shop/festive-popup";
import { AdPopup } from "@/components/ads/ad-popup";
import "./ads.css";
import "./hero.css";
import { PwaBoot } from "@/components/shop/pwa";
import "./site.css";
import "./account.css";
import "./payments.css";
import "./festive.css";
import "./festive-edit.css";
import "./artist-page.css";
import "./addons.css";
import "./music-play.css";
import "./playlists.css";
import "./artist-dashboard.css";
import "./fans.css";
import "./protect.css";
import "./polish.css";
import "./label.css";
import "./mobile-player.css";
import "./growth.css";
import { siteUrl } from "@/lib/seo";
import "./trust.css";
import "./track.css";
import "./messages.css";
import { SourceCapture } from "@/components/track/source-capture";
import { MetaPixel } from "@/components/track/meta-pixel";
import { ConsentBanner } from "@/components/track/consent-banner";
import { WhatsAppFloat } from "@/components/shop/whatsapp-chat";

export const metadata: Metadata = {
  title: "Fish Guy | Frozen Food Delivery in Lagos",
  description: "Frozen fish, turkey and chicken delivered across Lagos. Listen to independent music from Fish Guy Sounds while you shop.",
  applicationName: "Fish Guy",
  metadataBase: new URL(siteUrl()),
  keywords: ["frozen fish Lagos", "frozen food delivery Lagos", "buy frozen fish online Lagos", "frozen chicken and turkey Lagos", "frozen food for restaurants Lagos", "Fish Guy"],
  openGraph: { siteName: "Fish Guy", type: "website", locale: "en_NG", title: "Fish Guy | Frozen Food Delivery in Lagos", description: "Frozen fish, turkey and chicken delivered across Lagos.", images: ["/icons/icon-512.png"] },
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
            <FestiveRibbon />
            <SiteHeader />
            {children}
            <SiteFooter />
          </div>
          <MiniPlayer />
          <WhatsAppFloat />
          <FestivePopup />
          <AdPopup />
          <PwaBoot />
          <SourceCapture />
          <MetaPixel />
          <ConsentBanner />
        </MusicPlayerProvider>
      </CartProvider>
    </div>
  );
}
