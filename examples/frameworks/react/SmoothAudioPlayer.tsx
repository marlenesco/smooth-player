import { useEffect, useRef } from "react";
import {
  SmoothPlayer,
  mountPlayerUI,
  type PlaylistEntry,
  type SmoothPlayerOptions,
  type StandardPlayerUIMountOptions,
  type VisualizerMode,
} from "smooth-player";

export interface SmoothAudioPlayerProps {
  tracks: PlaylistEntry[];
  accentColor?: string;
  backgroundColor?: string;
  visualizer?: VisualizerMode;
  initialVolume?: number;
  playerOptions?: Omit<SmoothPlayerOptions, "playlist" | "accentColor" | "backgroundColor" | "visualizer" | "initialVolume">;
  uiOptions?: StandardPlayerUIMountOptions;
}

export function SmoothAudioPlayer({
  tracks,
  accentColor = "#0ed2a4",
  backgroundColor = "#0b1220",
  visualizer = "spectrum",
  initialVolume = 0.8,
  playerOptions,
  uiOptions,
}: SmoothAudioPlayerProps) {
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const player = new SmoothPlayer({
      ...playerOptions,
      accentColor,
      backgroundColor,
      visualizer,
      initialVolume,
      playlist: tracks,
    });

    const ui = mountPlayerUI(player, root, uiOptions);

    return () => {
      ui.destroy();
      player.destroy();
    };
  }, [tracks, accentColor, backgroundColor, visualizer, initialVolume, playerOptions, uiOptions]);

  return <section ref={rootRef} />;
}
