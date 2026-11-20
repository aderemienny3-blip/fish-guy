"use client";

import { Play } from "lucide-react";
import { useMusicPlayer } from "@/components/music/music-player";
import type { MusicTrack } from "@/lib/music/data";

export function ArtistPlay({ tracks }: { tracks: MusicTrack[] }) {
  const { playTrack } = useMusicPlayer();
  const queue = tracks.filter((t) => t.canPlay);
  if (queue.length === 0) return null;
  return (
    <button className="artist-play" type="button" onClick={() => playTrack(queue[0], queue)} aria-label="Play all tracks by this artist">
      <Play aria-hidden="true" /> Play
    </button>
  );
}
