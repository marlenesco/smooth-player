import type { DefineComponent } from "vue";
import type { AudioTrack, VisualizerMode } from "smooth-player";

export interface SmoothAudioPlayerProps {
  tracks: AudioTrack[];
  accentColor?: string;
  visualizer?: VisualizerMode;
  initialVolume?: number;
}

declare const SmoothAudioPlayer: DefineComponent<SmoothAudioPlayerProps>;

export { SmoothAudioPlayer };
export default SmoothAudioPlayer;
