# Smooth Player

Smooth Player is a TypeScript audio player for the web with built-in playlist handling, visualizers, accent-based styling, and reusable UI mount helpers.

## Features

- Single track and playlist playback
- Nested playlists (`AudioPlaylist` inside `PlaylistEntry`)
- Automatic playlist behavior:
  - If there is only one track, playlist controls stay hidden
  - If there are multiple tracks, next/previous + playlist panel are available
- Visualizer modes: `spectrum`, `waveform`, `none`
- Circular draggable progress ring support
- Configurable `accentColor` through player config
- Built-in debug panel support
- Typed API (`.d.ts`) with ESM + CJS builds

## Install

```bash
npm install smooth-player
```

![Smooth Player screenshot](examples/screenshot/example.png)

## Quick Start

```ts
import { SmoothPlayer, mountStandardPlayerUI } from "smooth-player";
import "smooth-player/dist/smooth-player.css";

const tracks = [
  {
    id: "song-1",
    src: "/audio/song-1.mp3",
    metadata: { title: "Song 1", artist: "Artist 1" },
  },
  {
    id: "song-2",
    src: "/audio/song-2.mp3",
    metadata: { title: "Song 2", artist: "Artist 2" },
  },
];

const player = new SmoothPlayer({
  playlist: tracks,
  initialVolume: 0.8,
  visualizer: "spectrum",
  accentColor: "#0ed2a4",
  debug: false,
});

const root = document.querySelector("#player-root");
if (!(root instanceof HTMLElement)) throw new Error("Missing #player-root");

mountStandardPlayerUI(player, root);
```

## Core Config (`SmoothPlayerOptions`)

- `playlist?: PlaylistEntry[]`
- `visualizer?: "spectrum" | "waveform" | "none"` (default: `"spectrum"`)
- `accentColor?: string` (default: `#0ed2a4`)
- `debug?: boolean` (default: `false`)
- `initialVolume?: number`
- `initialTrackIndex?: number`
- `initialShuffle?: boolean`
- `autoplay?: boolean`
- `loop?: boolean`
- `durationFallback?: boolean` (default: `true`, fallback decode for unknown metadata duration)
- `analyzer?: { fftSize, smoothingTimeConstant, minDecibels, maxDecibels }`

## Visualizer

At runtime:

```ts
player.setVisualizer("waveform");
const current = player.getVisualizer(); // "waveform"
```

Raw data API:

- `getSpectrumData()`
- `getWaveformData()`

Exported visualizer classes:

- `CanvasRadialVisualizer`
- `CanvasSpectrumVisualizer`
- `CanvasWaveformVisualizer`

## Debug

Enable debug directly in config:

```ts
const player = new SmoothPlayer({
  playlist: tracks,
  debug: true,
});
```

Use `mountDebugPanel(...)` to bind debug metrics to your elements, or call `mountStandardPlayerUI(player, root, { debugEnabled: true })` when your DOM includes the debug panel nodes.

Runtime methods:

- `setDebug(enabled: boolean)`
- `getDebug()`

## Playlists (including nested)

```ts
const playlist = [
  {
    id: "focus",
    title: "Focus",
    tracks: [
      { id: "f-1", src: "/audio/focus-1.mp3", metadata: { title: "Focus 1" } },
      {
        id: "focus-deep",
        title: "Focus Deep",
        tracks: [{ id: "fd-1", src: "/audio/focus-deep-1.mp3", metadata: { title: "Deep 1" } }],
      },
    ],
  },
  {
    id: "chill",
    title: "Chill",
    tracks: [{ id: "c-1", src: "/audio/chill-1.mp3", metadata: { title: "Chill 1" } }],
  },
];

const player = new SmoothPlayer({ playlist });
player.selectPlaylist("chill");
```

Playlist API highlights:

- `setPlaylist(entries, startIndex?)`
- `getPlaylists()`
- `getCurrentPlaylist()`
- `selectPlaylist(playlistId, startIndex?)`

## Events

Subscribe with `player.on(eventName, handler)`:

- `ready`
- `play`
- `pause`
- `ended`
- `playlistchange`
- `trackchange`
- `durationchange`
- `timeupdate`
- `volumechange`
- `error`

## UI Mount Helpers

- `mountStandardPlayerUI(player, root, options?)`
- `mountTrackInfo(titleElement, artistElement, options?)`
- `mountPlayButton(buttonElement, options?)`
- `mountProgress(options)`
- `mountTransportControls(options)`
- `mountShuffleToggle(options)`
- `mountPlaylistPanel(options)`
- `mountPlaylistSwitcher(container, options?)`
- `mountPlaylist(container, options?)`
- `mountPlaylistTitle(element, options?)`
- `mountDebugPanel(options)`

## Utility Methods

- `setAccentColor(color)`
- `getAccentColor()`
- `applyAccentColor(targetElement)`
- `formatTime(seconds)`
- `getState()`
- `getAudioElement()`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run build:css`
- `npm run typecheck`
- `npm run demo`

## Local Demo

```bash
npm install
npm run demo
```

Open:

- `http://127.0.0.1:4173/examples/demo.html`

## Media Attribution and CORS

Audio tracks included in this repository are provided for demonstration purposes only.

- Part of the demo media is sourced from [Pixabay](https://pixabay.com/).
- Additional demo files are SoundHelix songs available in `examples/audio`.

If you load audio from external hosts, those sources must be CORS-enabled for browser playback and analysis features.
The media server should return a valid `Access-Control-Allow-Origin` header for your application origin (or `*` when appropriate).
Without proper CORS headers, browsers may block playback and prevent analyzer/visualizer processing.
