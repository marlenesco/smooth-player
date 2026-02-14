<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import {
    SmoothPlayer,
    mountPlayerUI,
    type PlaylistEntry,
    type SmoothPlayerOptions,
    type StandardPlayerUIMountOptions,
    type VisualizerMode,
  } from "smooth-player";

  export let tracks: PlaylistEntry[] = [];
  export let accentColor = "#0ed2a4";
  export let backgroundColor = "#0b1220";
  export let visualizer: VisualizerMode = "spectrum";
  export let initialVolume = 0.8;
  export let playerOptions: Omit<SmoothPlayerOptions, "playlist" | "accentColor" | "backgroundColor" | "visualizer" | "initialVolume"> | undefined = undefined;
  export let uiOptions: StandardPlayerUIMountOptions | undefined = undefined;

  let root: HTMLElement;
  let player: SmoothPlayer | null = null;
  let destroyUI: (() => void) | null = null;
  let mounted = false;

  const teardown = () => {
    destroyUI?.();
    destroyUI = null;
    player?.destroy();
    player = null;
  };

  const setup = () => {
    if (!mounted || !root) return;
    teardown();
    player = new SmoothPlayer({
      ...playerOptions,
      accentColor,
      backgroundColor,
      visualizer,
      initialVolume,
      playlist: tracks,
    });
    const ui = mountPlayerUI(player, root, uiOptions);
    destroyUI = () => ui.destroy();
  };

  onMount(() => {
    mounted = true;
    setup();
  });

  onDestroy(() => {
    mounted = false;
    teardown();
  });

  $: if (mounted && root) {
    tracks;
    accentColor;
    backgroundColor;
    visualizer;
    initialVolume;
    playerOptions;
    uiOptions;
    setup();
  }
</script>

<section bind:this={root}></section>
