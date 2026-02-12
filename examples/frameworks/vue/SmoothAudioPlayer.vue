<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from "vue";
import {
  SmoothPlayer,
  CanvasSpectrumVisualizer,
  CanvasWaveformVisualizer,
  type AudioTrack,
  type VisualizerMode,
} from "smooth-player";

const props = withDefaults(defineProps<{
  tracks: AudioTrack[];
  accentColor?: string;
  visualizer?: VisualizerMode;
  initialVolume?: number;
}>(), {
  accentColor: "#0ed2a4",
  visualizer: "spectrum",
  initialVolume: 0.8,
});

const rootRef = ref<HTMLElement | null>(null);
const spectrumRef = ref<HTMLCanvasElement | null>(null);
const waveformRef = ref<HTMLCanvasElement | null>(null);
const player = ref<SmoothPlayer | null>(null);
const currentIndex = ref(0);
const isPlaying = ref(false);

const currentTrack = computed(() => props.tracks[currentIndex.value] ?? null);

let spectrum: CanvasSpectrumVisualizer | null = null;
let waveform: CanvasWaveformVisualizer | null = null;

onMounted(() => {
  const instance = new SmoothPlayer({
    initialVolume: props.initialVolume,
    visualizer: props.visualizer,
    accentColor: props.accentColor,
  });
  instance.setPlaylist(props.tracks, 0);
  player.value = instance;

  if (props.visualizer === "spectrum") {
    spectrum = new CanvasSpectrumVisualizer(spectrumRef.value!, instance, { color: "#3cc8d9" });
    spectrum.start();
  }

  if (props.visualizer === "waveform") {
    waveform = new CanvasWaveformVisualizer(waveformRef.value!, instance, { color: "#e7f0ff" });
    waveform.start();
  }

  instance.on("trackchange", ({ index }) => (currentIndex.value = index));
  instance.on("play", () => (isPlaying.value = true));
  instance.on("pause", () => (isPlaying.value = false));

  applyAccent();
});

onBeforeUnmount(() => {
  spectrum?.stop();
  waveform?.stop();
  player.value?.destroy();
});

watch(() => props.accentColor, () => applyAccent());

function applyAccent() {
  if (!player.value || !rootRef.value) return;
  player.value.setAccentColor(props.accentColor);
  player.value.applyAccentColor(rootRef.value);
}

async function toggle() {
  await player.value?.toggle();
}
</script>

<template>
  <section ref="rootRef" class="smooth-player">
    <div class="smooth-player__main">
      <div class="smooth-player__row">
        <h2 class="smooth-player__title">Smooth Player</h2>
        <div class="smooth-player__controls">
          <button class="secondary" @click="player?.previous()" aria-label="Previous">
            <img class="smooth-player__icon" src="/assets/icons/prev.svg" alt="" />
          </button>
          <button @click="toggle" :aria-label="isPlaying ? 'Pause' : 'Play'">
            <img class="smooth-player__icon" :src="isPlaying ? '/assets/icons/pause.svg' : '/assets/icons/play.svg'" alt="" />
          </button>
          <button class="secondary" @click="player?.next()" aria-label="Next">
            <img class="smooth-player__icon" src="/assets/icons/next.svg" alt="" />
          </button>
        </div>
      </div>

      <div class="smooth-player__meta">
        <strong>{{ currentTrack?.metadata?.title ?? "Unknown title" }}</strong>
        <div class="smooth-player__artist">{{ currentTrack?.metadata?.artist ?? "Unknown artist" }}</div>
      </div>

      <canvas ref="spectrumRef" id="spectrum" class="smooth-player__canvas" width="860" height="180" :hidden="props.visualizer !== 'spectrum'"></canvas>
      <canvas ref="waveformRef" id="waveform" class="smooth-player__canvas" width="860" height="120" :hidden="props.visualizer !== 'waveform'"></canvas>
    </div>
  </section>
</template>
