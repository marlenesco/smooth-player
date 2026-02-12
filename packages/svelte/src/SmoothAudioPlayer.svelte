<script lang="ts">
  import { onMount } from "svelte";
  import {
    SmoothPlayer,
    CanvasSpectrumVisualizer,
    CanvasWaveformVisualizer,
    type AudioTrack,
    type VisualizerMode,
  } from "smooth-player";
  import prevIcon from "./assets/prev.svg";
  import nextIcon from "./assets/next.svg";
  import playIcon from "./assets/play.svg";
  import pauseIcon from "./assets/pause.svg";

  export let tracks: AudioTrack[] = [];
  export let accentColor = "#0ed2a4";
  export let visualizer: VisualizerMode = "spectrum";
  export let initialVolume = 0.8;

  let root: HTMLElement;
  let spectrumCanvas: HTMLCanvasElement;
  let waveformCanvas: HTMLCanvasElement;

  let player: SmoothPlayer;
  let currentIndex = 0;
  let isPlaying = false;

  const applyTheme = () => {
    player.setAccentColor(accentColor);
    player.applyAccentColor(root);
  };

  $: if (player && root) {
    applyTheme();
  }

  onMount(() => {
    player = new SmoothPlayer({ initialVolume, visualizer, accentColor });
    player.setPlaylist(tracks, 0);

    let spectrum: CanvasSpectrumVisualizer | null = null;
    let waveform: CanvasWaveformVisualizer | null = null;

    if (visualizer === "spectrum") {
      spectrum = new CanvasSpectrumVisualizer(spectrumCanvas, player, { color: "#3cc8d9" });
      spectrum.start();
    }

    if (visualizer === "waveform") {
      waveform = new CanvasWaveformVisualizer(waveformCanvas, player, { color: "#e7f0ff" });
      waveform.start();
    }

    player.on("trackchange", ({ index }) => (currentIndex = index));
    player.on("play", () => (isPlaying = true));
    player.on("pause", () => (isPlaying = false));

    applyTheme();

    return () => {
      spectrum?.stop();
      waveform?.stop();
      player.destroy();
    };
  });
</script>

<section bind:this={root} class="smooth-player">
  <div class="smooth-player__main">
    <div class="smooth-player__row">
      <h2 class="smooth-player__title">Smooth Player</h2>
      <div class="smooth-player__controls">
        <button class="secondary" on:click={() => player.previous()} aria-label="Previous">
          <img class="smooth-player__icon" src={prevIcon} alt="" />
        </button>
        <button on:click={() => player.toggle()} aria-label={isPlaying ? "Pause" : "Play"}>
          <img class="smooth-player__icon" src={isPlaying ? pauseIcon : playIcon} alt="" />
        </button>
        <button class="secondary" on:click={() => player.next()} aria-label="Next">
          <img class="smooth-player__icon" src={nextIcon} alt="" />
        </button>
      </div>
    </div>

    <div class="smooth-player__meta">
      <strong>{tracks[currentIndex]?.metadata?.title ?? "Unknown title"}</strong>
      <div class="smooth-player__artist">{tracks[currentIndex]?.metadata?.artist ?? "Unknown artist"}</div>
    </div>

    <canvas bind:this={spectrumCanvas} id="spectrum" class="smooth-player__canvas" width="860" height="180" hidden={visualizer !== "spectrum"}></canvas>
    <canvas bind:this={waveformCanvas} id="waveform" class="smooth-player__canvas" width="860" height="120" hidden={visualizer !== "waveform"}></canvas>
  </div>
</section>
