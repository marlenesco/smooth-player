import type {
  PlaylistEntry,
  SmoothPlayerOptions,
  StandardPlayerUIMountOptions,
  VisualizerMode,
} from "smooth-player";
import type { SvelteComponentTyped } from "svelte";

export interface SmoothAudioPlayerProps {
  tracks: PlaylistEntry[];
  accentColor?: string;
  backgroundColor?: string;
  visualizer?: VisualizerMode;
  initialVolume?: number;
  playerOptions?: Omit<SmoothPlayerOptions, "playlist" | "accentColor" | "backgroundColor" | "visualizer" | "initialVolume">;
  uiOptions?: StandardPlayerUIMountOptions;
}

export default class SmoothAudioPlayer extends SvelteComponentTyped<SmoothAudioPlayerProps> {}
export { SmoothAudioPlayer };
