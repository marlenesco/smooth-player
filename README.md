# smooth-player

Audio player TypeScript per web con:

- traccia singola o playlist
- visualizer (`spectrum`, `waveform`, `none`)
- progress circolare drag-to-seek (demo)
- accent color configurabile
- output ESM + CJS + types

Nota comportamento playlist:

- `mode` non serve piu
- con 1 traccia il player si comporta come singolo
- con piu tracce avanza automaticamente al brano successivo a fine riproduzione (se `loop` non e attivo)
- il titolo playlist corrente viene mostrato automaticamente nel player (top title)

## Install

```bash
npm install smooth-player
```

## Uso base

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

## Playlist annidate

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

Metodi accent:

- `setAccentColor(color)`
- `getAccentColor()`
- `applyAccentColor(targetElement)`

Playlist UI nativa (opzionale):

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

## Demo locale

```bash
npm install
npm run demo
```

Apri:

- `http://127.0.0.1:4173/examples/demo.html`
- debug: `http://127.0.0.1:4173/examples/demo.html?debug=1`
