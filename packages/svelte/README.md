# @smooth-player/svelte

Svelte wrapper component for [`smooth-player`](https://www.npmjs.com/package/smooth-player).

## Install

```bash
npm install smooth-player @smooth-player/svelte
```

## Usage

```svelte
<script>
  import "smooth-player/dist/smooth-player.css";
  import { SmoothAudioPlayer } from "@smooth-player/svelte";
</script>

<SmoothAudioPlayer {tracks} accentColor="#0ed2a4" visualizer="spectrum" initialVolume={0.8} />
```
