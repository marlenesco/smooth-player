# @smooth-player/vue

Vue wrapper component for [`smooth-player`](https://www.npmjs.com/package/smooth-player).

## Install

```bash
npm install smooth-player @smooth-player/vue
```

## Usage

```vue
<script setup>
import "smooth-player/dist/smooth-player.css";
import { SmoothAudioPlayer } from "@smooth-player/vue";
</script>

<template>
  <SmoothAudioPlayer :tracks="tracks" accent-color="#0ed2a4" visualizer="spectrum" :initial-volume="0.8" />
</template>
```
