import { SmoothPlayer } from "./SmoothPlayer.js";
import { CanvasRadialVisualizer } from "./visualizers.js";
import { type StandardPlayerUIController, type StandardPlayerUIMountOptions } from "./types.js";

function requiredElement<T extends Element>(scope: ParentNode, selector: string): T {
  const element = scope.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element as T;
}

export function mountStandardPlayerUI(
  player: SmoothPlayer,
  root: HTMLElement,
  options: StandardPlayerUIMountOptions = {},
): StandardPlayerUIController {
  const doc = root.ownerDocument ?? document;
  const debugEnabled = options.debugEnabled ?? player.getDebug();

  const title = requiredElement<HTMLElement>(root, "#title");
  const artist = requiredElement<HTMLElement>(root, "#artist");
  const playlistTitle = requiredElement<HTMLElement>(root, ".smooth-player__top-title");
  const progress = requiredElement<HTMLInputElement>(root, "#progress");
  const timeCurrent = requiredElement<HTMLElement>(root, "#time-current");
  const timeDuration = requiredElement<HTMLElement>(root, "#time-duration");
  const playButton = requiredElement<HTMLButtonElement>(root, "#play");
  const playText = requiredElement<HTMLElement>(root, "#play-text");
  const prevButton = requiredElement<HTMLElement>(root, "#prev");
  const nextButton = requiredElement<HTMLElement>(root, "#next");
  const playlistToggle = requiredElement<HTMLButtonElement>(root, "#playlist-toggle");
  const shuffleToggle = requiredElement<HTMLButtonElement>(root, "#shuffle-toggle");
  const shuffleText = requiredElement<HTMLElement>(root, "#shuffle-text");
  const playlistPanel = requiredElement<HTMLElement>(root, "#playlist-panel");
  const playlistHead = requiredElement<HTMLElement>(root, ".smooth-player__playlist-head");
  const playlistClose = requiredElement<HTMLElement>(root, "#playlist-close");
  const playlistList = requiredElement<HTMLElement>(root, "#playlist-list");
  const radialCanvas = requiredElement<HTMLCanvasElement>(root, "#radial-visualizer");
  const progressRing = requiredElement<HTMLElement>(root, "#progress-ring");

  const unmounts: Array<() => void> = [];
  let radial: CanvasRadialVisualizer | null = null;

  const rebuildVisualizer = (): void => {
    radial?.stop();
    const mode = player.getVisualizer();
    radialCanvas.hidden = mode === "none";
    if (mode === "none") {
      radial = null;
      return;
    }

    radial = new CanvasRadialVisualizer(radialCanvas, player, {
      mode,
      color: player.getAccentColor(),
      background: "transparent",
    });
    radial.start();
  };

  const playlistPanelController = player.mountPlaylistPanel({
    root,
    toggleButton: playlistToggle,
    panel: playlistPanel,
    closeButton: playlistClose,
  });
  unmounts.push(() => playlistPanelController.destroy());
  unmounts.push(player.mountPlaylistTitle(playlistTitle));

  unmounts.push(player.mountShuffleToggle({
    button: shuffleToggle,
    labelElement: shuffleText,
    initialEnabled: false,
  }));
  unmounts.push(player.mountTransportControls({
    previousButton: prevButton,
    nextButton: nextButton,
  }));
  if (debugEnabled) {
    const debugPanel = requiredElement<HTMLElement>(doc, "#debug-panel");
    const dbgSrc = requiredElement<HTMLElement>(doc, "#dbg-src");
    const dbgCurrentTime = requiredElement<HTMLElement>(doc, "#dbg-current-time");
    const dbgDuration = requiredElement<HTMLElement>(doc, "#dbg-duration");
    const dbgReadyState = requiredElement<HTMLElement>(doc, "#dbg-ready-state");
    const dbgNetworkState = requiredElement<HTMLElement>(doc, "#dbg-network-state");
    const dbgPaused = requiredElement<HTMLElement>(doc, "#dbg-paused");
    const dbgEvents = requiredElement<HTMLElement>(doc, "#dbg-events");

    unmounts.push(player.mountDebugPanel({
      enabled: true,
      panel: debugPanel,
      sourceElement: dbgSrc,
      currentTimeElement: dbgCurrentTime,
      durationElement: dbgDuration,
      readyStateElement: dbgReadyState,
      networkStateElement: dbgNetworkState,
      pausedElement: dbgPaused,
      eventsElement: dbgEvents,
    }));
  }

  player.applyAccentColor(root);
  unmounts.push(player.mountTrackInfo(title, artist));
  unmounts.push(player.mountPlayButton(playButton, {
    labelElement: playText,
    playLabel: "Riproduci",
    pauseLabel: "Pausa",
  }));
  unmounts.push(player.mountProgress({
    range: progress,
    currentTimeElement: timeCurrent,
    durationElement: timeDuration,
    progressRoot: root,
    ringElement: progressRing,
  }));
  unmounts.push(player.mountPlaylist(playlistList, {
    onSelect: () => playlistPanelController.setOpen(false),
  }));

  const switcher = doc.createElement("div");
  switcher.className = "smooth-player__playlist-switcher";
  playlistHead.insertAdjacentElement("afterend", switcher);
  unmounts.push(player.mountPlaylistSwitcher(switcher));

  rebuildVisualizer();

  return {
    rebuildVisualizer,
    destroy: (): void => {
      radial?.stop();
      radial = null;
      for (const unmount of unmounts) {
        unmount();
      }
      switcher.remove();
    },
  };
}
