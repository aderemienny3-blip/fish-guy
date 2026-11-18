"use client";

import { Pause, Play } from "lucide-react";
import { useMusicPlayer } from "@/components/music/music-player";
import { recordAd } from "@/lib/ads/client";

/** Plays the promoted song right here in the site player. */
export function AdPlay({ trackId, adId }: { trackId: string; adId: string }) {
  const { currentTrack, isPlaying, isStarting, playById, togglePlayback } = useMusicPlayer();
  const active = currentTrack?.id === trackId;
  return (
    <button
      type="button"
      className="button button-gold"
      disabled={isStarting}
      onClick={() => {
        recordAd(adId, "CLICK");
        if (active) togglePlayback();
        else void playById(trackId);
      }}
    >
      {active && isPlaying ? <Pause fill="currentColor" aria-hidden="true" /> : <Play fill="currentColor" aria-hidden="true" />}
      {active && isPlaying ? "Pause" : "Play now"}
    </button>
  );
}
