# @smooth-player/react

React wrapper component for [`smooth-player`](https://www.npmjs.com/package/smooth-player).

## Install

```bash
npm install smooth-player @smooth-player/react
```

## Usage

```tsx
import "smooth-player/dist/smooth-player.css";
import { SmoothAudioPlayer } from "@smooth-player/react";

<SmoothAudioPlayer
  tracks={tracks}
  accentColor="#0ed2a4"
  visualizer="spectrum"
  initialVolume={0.8}
/>;
```
