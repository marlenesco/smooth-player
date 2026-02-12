# Smooth Player

A TypeScript audio player for the web with:

- single track or playlist playback
- visualizer modes (`spectrum`, `waveform`, `none`)
- draggable circular progress ring (demo UI)
- configurable accent color
- ESM + CJS + type definitions output

Playlist behavior notes:

- `mode` is no longer required
- with 1 track, it behaves like a single-track player
- with multiple tracks, it automatically advances when playback ends (if `loop` is disabled)
- the active playlist title is shown automatically in the player top area

## Install

```bash
npm install smooth-player
```

## Basic usage

```ts
import { SmoothPlayer } from "smooth-player";

const player = new SmoothPlayer({
  initialVolume: 0.8,
  visualizer: "spectrum",
  accentColor: "#0ed2a4",
  debug: false,
  playlist: [
    { id: "1", src: "/audio/song-1.mp3", metadata: { title: "Song 1", artist: "Artist" } },
  ],
});

player.setAccentColor("#ff7a59");
await player.play();
```

## Nested playlists

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
        tracks: [
          { id: "fd-1", src: "/audio/focus-deep-1.mp3", metadata: { title: "Deep 1" } },
        ],
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
```

Accent methods:

- `setAccentColor(color)`
- `getAccentColor()`
- `applyAccentColor(targetElement)`

Native playlist/player UI helpers (optional):

- `mountPlaylist(container, options?)`
- `mountTrackInfo(titleElement, artistElement, options?)`
- `mountPlayButton(buttonElement, options?)`
- `mountProgress(options)`
- `mountTransportControls(options)`
- `mountShuffleToggle(options)`
- `mountPlaylistPanel(options)`
- `mountDebugPanel(options)`
- `mountStandardPlayerUI(player, root, options?)`
- `formatTime(seconds)`

## Scripts

- `npm run dev`
- `npm run build`
- `npm run build:css`
- `npm run typecheck`
- `npm run demo`

## Local demo

```bash
npm install
npm run demo
```

Open:

- `http://127.0.0.1:4173/examples/demo.html`
- debug: `http://127.0.0.1:4173/examples/demo.html?debug=1`
