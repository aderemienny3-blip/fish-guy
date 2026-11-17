import type { Metadata, Viewport } from "next";
import { MiniPlayer, MusicPlayerProvider } from "@/components/music/music-player";
import { SiteFooter, SiteHeader } from "@/components/music/site-shell";
import { CartProvider } from "@/components/shop/cart";
import "./site.css";

export const metadata: Metadata = {
  title: "Fish Guy | Frozen Food Delivery in Lagos",
  description: "Frozen fish, turkey and chicken delivered across Lagos. Listen to independent music from Fish Guy Sounds while you shop.",
  applicationName: "Fish Guy",
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
        </MusicPlayerProvider>
      </CartProvider>
    </div>
  );
}
