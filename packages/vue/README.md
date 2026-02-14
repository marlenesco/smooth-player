# @smooth-player/vue

Vue wrapper component for [`smooth-player`](https://www.npmjs.com/package/smooth-player).

## Install

```bash
npm install smooth-player @smooth-player/vue
```

## Usage

```vue
<script setup lang="ts">
import "smooth-player/dist/smooth-player.css";
import { SmoothAudioPlayer } from "@smooth-player/vue";
import type { PlaylistEntry } from "smooth-player";

const tracks: PlaylistEntry[] = [
  {
    id: "demo",
    title: "Demo Playlist",
    tracks: [
      {
        id: "song-1",
        src: "https://cdn.pixabay.com/audio/2020/08/17/audio_613575b827.mp3",
        metadata: { title: "Robot Gypsy Jazz", artist: "Frank Vanga" },
      },
    ],
  },
];
</script>

<template>
  <SmoothAudioPlayer
    :tracks="tracks"
    accent-color="#0ed2a4"
    background-color="#0b1220"
    visualizer="spectrum"
    :initial-volume="0.8"
    :ui-options="{ showLogo: true }"
  />
</template>
```

## Component props

- `tracks: PlaylistEntry[]`
- `accentColor?: string`
- `backgroundColor?: string`
- `visualizer?: "spectrum" | "waveform" | "none"`
- `initialVolume?: number`
- `playerOptions?: Omit<SmoothPlayerOptions, "playlist" | "accentColor" | "backgroundColor" | "visualizer" | "initialVolume">`
- `uiOptions?: StandardPlayerUIMountOptions`

## Prop Mapping

| Wrapper prop | Core equivalent |
| --- | --- |
| `tracks` | `new SmoothPlayer({ playlist: tracks })` |
| `accentColor` | `new SmoothPlayer({ accentColor })` |
| `backgroundColor` | `new SmoothPlayer({ backgroundColor })` |
| `visualizer` | `new SmoothPlayer({ visualizer })` |
| `initialVolume` | `new SmoothPlayer({ initialVolume })` |
| `playerOptions` | Spread into `SmoothPlayerOptions` |
| `uiOptions` | Passed to `mountPlayerUI(player, root, uiOptions)` |

## Documentation

For the full list of player config options, runtime APIs, events, and UI options, see the main docs:

- [smooth-player README](https://github.com/marlenesco/smooth-player#readme)
