import { SmoothPlayer, mountPlayerUI } from "../dist/index.js";
import { playlists } from "./playlists.js";

const player = new SmoothPlayer({
  initialVolume: 0.8,
  visualizer: "spectrum",
  accentColor: "#8aef0f",
  backgroundColor: "#1b1511",
  playlist: playlists,
  debug: new URLSearchParams(window.location.search).get("debug") === "1",
});


const root = document.querySelector("#player-root");
if (!(root instanceof HTMLElement)) {
  throw new Error("Missing #player-root");
}

mountPlayerUI(player, root, { debugEnabled: player.getDebug() });
