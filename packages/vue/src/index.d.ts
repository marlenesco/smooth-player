import type { DefineComponent } from "vue";
import type {
  PlaylistEntry,
  SmoothPlayerOptions,
  StandardPlayerUIMountOptions,
  VisualizerMode,
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

declare const SmoothAudioPlayer: DefineComponent<SmoothAudioPlayerProps>;

export { SmoothAudioPlayer };
export default SmoothAudioPlayer;
