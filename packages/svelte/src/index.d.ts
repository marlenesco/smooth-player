import type { AudioTrack, VisualizerMode } from "smooth-player";
import type { SvelteComponentTyped } from "svelte";

export interface SmoothAudioPlayerProps {
  tracks: AudioTrack[];
  accentColor?: string;
  visualizer?: VisualizerMode;
  initialVolume?: number;
}

export default class SmoothAudioPlayer extends SvelteComponentTyped<SmoothAudioPlayerProps> {}
export { SmoothAudioPlayer };
