<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import {
  SmoothPlayer,
  mountPlayerUI,
  type PlaylistEntry,
  type SmoothPlayerOptions,
  type StandardPlayerUIMountOptions,
  type VisualizerMode,
} from "smooth-player";

const props = withDefaults(defineProps<{
  tracks: PlaylistEntry[];
  accentColor?: string;
  backgroundColor?: string;
  visualizer?: VisualizerMode;
  initialVolume?: number;
  playerOptions?: Omit<SmoothPlayerOptions, "playlist" | "accentColor" | "backgroundColor" | "visualizer" | "initialVolume">;
  uiOptions?: StandardPlayerUIMountOptions;
}>(), {
  accentColor: "#0ed2a4",
  backgroundColor: "#0b1220",
  visualizer: "spectrum",
  initialVolume: 0.8,
});

const rootRef = ref<HTMLElement | null>(null);
let player: SmoothPlayer | null = null;
let destroyUI: (() => void) | null = null;

const teardown = () => {
  destroyUI?.();
  destroyUI = null;
  player?.destroy();
  player = null;
};

watch(
  () => ({
    root: rootRef.value,
    tracks: props.tracks,
    accentColor: props.accentColor,
    backgroundColor: props.backgroundColor,
    visualizer: props.visualizer,
    initialVolume: props.initialVolume,
    playerOptions: props.playerOptions,
    uiOptions: props.uiOptions,
  }),
  () => {
    if (!rootRef.value) return;
    teardown();
    player = new SmoothPlayer({
      ...props.playerOptions,
      accentColor: props.accentColor,
      backgroundColor: props.backgroundColor,
      visualizer: props.visualizer,
      initialVolume: props.initialVolume,
      playlist: props.tracks,
    });
    const ui = mountPlayerUI(player, rootRef.value, props.uiOptions);
    destroyUI = () => ui.destroy();
  },
  { immediate: true, deep: true },
);

onBeforeUnmount(() => {
  teardown();
});
</script>

<template>
  <section ref="rootRef"></section>
</template>
