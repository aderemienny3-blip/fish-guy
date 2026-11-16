import type { Metadata, Viewport } from "next";
import { MiniPlayer, MusicPlayerProvider } from "@/components/music/music-player";
import { SiteFooter, SiteHeader } from "@/components/music/site-shell";
import "./sounds.css";

export const metadata: Metadata = {
  title: "Fish Guy Sounds | Lagos Hip-Hop",
  description:
    "Discover independent Lagos hip-hop, stream free releases, and buy music directly from the artists on Fish Guy Sounds.",
};

export const viewport: Viewport = { colorScheme: "dark", themeColor: "#0A0A0A" };

export default function MusicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="sounds-root">
      <MusicPlayerProvider>
        <div className="site-shell">
          <SiteHeader />
          {children}
          <SiteFooter />
        </div>
        <MiniPlayer />
      </MusicPlayerProvider>
    </div>
  );
}
