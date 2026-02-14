import { SmoothPlayer } from "./SmoothPlayer.js";
import { CanvasRadialVisualizer } from "./visualizers.js";
import {
  type SpectrumStyleOptions,
  type StandardPlayerUIController,
  type StandardPlayerUIMountOptions,
  type VisualizerMode,
} from "./types.js";
import { strings } from "./i18n/strings.js";

type StoredUserPreferences = {
  visualizer?: VisualizerMode;
  spectrumStyle?: Partial<SpectrumStyleOptions>;
  waveformStyle?: {
    doubleLine?: boolean;
    fill?: boolean;
    thickLine?: boolean;
  };
  shuffle?: boolean;
};

function requiredElement<T extends Element>(scope: ParentNode, selector: string): T {
  const element = scope.querySelector(selector);
  if (!element) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return element as T;
}

function renderPlayerMarkup(root: HTMLElement, debugEnabled: boolean): void {
  root.classList.add("smooth-player");
  root.innerHTML = `
    <div class="smooth-player__main">
      <div class="smooth-player__top">
        <div class="smooth-player__top-title">${strings.playlist.defaultTitle}</div>
        <button id="shuffle-toggle" type="button" aria-label="${strings.shuffle.disabledLabel}" aria-pressed="false" hidden>
          <span class="smooth-player__icon-shuffle" aria-hidden="true"></span>
          <span id="shuffle-text" class="smooth-player__sr-only">${strings.shuffle.disabledLabel}</span>
        </button>
      </div>

      <div class="smooth-player__hero">
        <div id="progress-ring" class="smooth-player__ring">
          <div class="smooth-player__ring-inner">
            <div class="smooth-player__cover">
              <canvas id="radial-visualizer" class="smooth-player__cover-canvas" width="320" height="320"></canvas>
            </div>
          </div>
        </div>
        <button id="play" class="smooth-player__hero-play" type="button" aria-label="${strings.playback.playLabel}" aria-pressed="false">
          <span id="play-icon" class="smooth-player__icon-play" aria-hidden="true"></span>
          <span id="play-text" class="smooth-player__sr-only">${strings.playback.playLabel}</span>
        </button>
      </div>

      <div class="smooth-player__meta">
        <strong id="title">-</strong>
        <div id="artist" class="smooth-player__artist">-</div>
      </div>

      <div class="smooth-player__progress-wrap">
        <input id="progress" class="smooth-player__progress" type="range" min="0" max="0" step="0.01" value="0" aria-label="Track position" />
        <div class="smooth-player__progress-row">
          <span id="time-current">00:00</span>
          <span id="time-duration">00:00</span>
        </div>
      </div>

      <div class="smooth-player__transport">
        <button id="prev" class="secondary" type="button" aria-label="Previous track">
          <img class="smooth-player__icon" src="/assets/icons/prev.svg" alt="" />
          <span class="smooth-player__sr-only">Previous track</span>
        </button>
        <button id="playlist-toggle" class="secondary smooth-player__transport-playlist" type="button" aria-label="${strings.playlist.openLabel}" aria-expanded="false" hidden>
          <img class="smooth-player__icon" src="/assets/icons/menu.svg" alt="" />
          <span class="smooth-player__sr-only">${strings.playlist.openLabel}</span>
        </button>
        <button id="next" class="secondary" type="button" aria-label="Next track">
          <img class="smooth-player__icon" src="/assets/icons/next.svg" alt="" />
          <span class="smooth-player__sr-only">Next track</span>
        </button>
      </div>
    </div>

    <aside id="playlist-panel" class="smooth-player__playlist" aria-hidden="true">
      <div class="smooth-player__playlist-head">
        <h2>Playlist</h2>
        <button id="playlist-close" class="smooth-player__playlist-close secondary" type="button" aria-label="${strings.playlist.closeLabel}">
          <span aria-hidden="true">&times;</span>
          <span class="smooth-player__sr-only">${strings.playlist.closeLabel}</span>
        </button>
      </div>
      <ul id="playlist-list" class="smooth-player__playlist-list" role="listbox" aria-label="Track list"></ul>
    </aside>
  `;

  if (!debugEnabled) return;
  const debugPanel = root.ownerDocument?.createElement("section") ?? document.createElement("section");
  debugPanel.id = "debug-panel";
  debugPanel.className = "smooth-player__debug";
  debugPanel.setAttribute("aria-live", "polite");
  debugPanel.hidden = true;
  debugPanel.innerHTML = `
    <h3>Audio Debug</h3>
    <div class="smooth-player__debug-grid">
      <div>src: <code id="dbg-src">-</code></div>
      <div>currentTime: <code id="dbg-current-time">-</code></div>
      <div>duration: <code id="dbg-duration">-</code></div>
      <div>readyState: <code id="dbg-ready-state">-</code></div>
      <div>networkState: <code id="dbg-network-state">-</code></div>
      <div>paused: <code id="dbg-paused">-</code></div>
    </div>
    <pre id="dbg-events" class="smooth-player__debug-events"></pre>
  `;
  root.append(debugPanel);
}

export function mountPlayerUI(
  player: SmoothPlayer,
  root: HTMLElement,
  options: StandardPlayerUIMountOptions = {},
): StandardPlayerUIController {
  const doc = root.ownerDocument ?? document;
  const debugEnabled = options.debugEnabled ?? player.getDebug();
  const enableAudioDrop = options.enableAudioDrop ?? true;
  const enableErrorNotice = options.enableErrorNotice ?? true;
  const showLogo = options.showLogo ?? true;
  const persistUserPreferences = options.persistUserPreferences ?? true;
  const preferencesCookieName = options.userPreferencesCookieName ?? "smooth_player_prefs";
  const preferencesMaxAgeDays = Math.max(1, options.userPreferencesMaxAgeDays ?? 365);

  renderPlayerMarkup(root, debugEnabled);

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
  const transport = requiredElement<HTMLElement>(root, ".smooth-player__transport");
  const playlistToggle = requiredElement<HTMLButtonElement>(root, "#playlist-toggle");
  const shuffleToggle = requiredElement<HTMLButtonElement>(root, "#shuffle-toggle");
  const shuffleText = requiredElement<HTMLElement>(root, "#shuffle-text");
  const playlistPanel = requiredElement<HTMLElement>(root, "#playlist-panel");
  const playlistHead = requiredElement<HTMLElement>(root, ".smooth-player__playlist-head");
  const playlistClose = requiredElement<HTMLElement>(root, "#playlist-close");
  const playlistList = requiredElement<HTMLElement>(root, "#playlist-list");
  const radialCanvas = requiredElement<HTMLCanvasElement>(root, "#radial-visualizer");
  const progressRing = requiredElement<HTMLElement>(root, "#progress-ring");
  const top = playlistTitle.parentElement;

  const unmounts: Array<() => void> = [];
  let radial: CanvasRadialVisualizer | null = null;
  let noticeTimer: ReturnType<typeof setTimeout> | null = null;
  let brandLogo: HTMLElement | null = null;
  let visualizerPanelOpen = false;

  const parsePreferencesCookie = (): StoredUserPreferences | null => {
    if (!persistUserPreferences) return null;
    const cookie = doc.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${preferencesCookieName}=`));
    if (!cookie) return null;
    const encoded = cookie.slice(preferencesCookieName.length + 1);
    try {
      const parsed = JSON.parse(decodeURIComponent(encoded)) as StoredUserPreferences;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const persistPreferences = (): void => {
    if (!persistUserPreferences) return;
    const state = player.getState();
    const payload: StoredUserPreferences = {
      visualizer: state.visualizer,
      spectrumStyle: state.spectrumStyle,
      waveformStyle: state.waveformStyle,
      shuffle: state.shuffle,
    };
    try {
      const serialized = encodeURIComponent(JSON.stringify(payload));
      const maxAge = Math.floor(preferencesMaxAgeDays * 24 * 60 * 60);
      doc.cookie = `${preferencesCookieName}=${serialized}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    } catch {
      // Ignore cookie failures silently.
    }
  };

  const applyStoredPreferences = (): void => {
    const stored = parsePreferencesCookie();
    if (!stored) return;

    if (stored.visualizer === "spectrum" || stored.visualizer === "waveform" || stored.visualizer === "none") {
      player.setVisualizer(stored.visualizer);
    }

    if (stored.spectrumStyle && typeof stored.spectrumStyle === "object") {
      const nextSpectrumStyle: Partial<SpectrumStyleOptions> = {};
      if (typeof stored.spectrumStyle.dualLayer === "boolean") nextSpectrumStyle.dualLayer = stored.spectrumStyle.dualLayer;
      if (typeof stored.spectrumStyle.inverted === "boolean") nextSpectrumStyle.inverted = stored.spectrumStyle.inverted;
      if (stored.spectrumStyle.barWidth === "thin" || stored.spectrumStyle.barWidth === "medium" || stored.spectrumStyle.barWidth === "large") {
        nextSpectrumStyle.barWidth = stored.spectrumStyle.barWidth;
      }
      player.setSpectrumStyle(nextSpectrumStyle);
    }

    if (stored.waveformStyle && typeof stored.waveformStyle === "object") {
      const nextWaveformStyle: {
        doubleLine?: boolean;
        fill?: boolean;
        thickLine?: boolean;
      } = {};
      if (typeof stored.waveformStyle.doubleLine === "boolean") nextWaveformStyle.doubleLine = stored.waveformStyle.doubleLine;
      if (typeof stored.waveformStyle.fill === "boolean") nextWaveformStyle.fill = stored.waveformStyle.fill;
      if (typeof stored.waveformStyle.thickLine === "boolean") nextWaveformStyle.thickLine = stored.waveformStyle.thickLine;
      player.setWaveformStyle(nextWaveformStyle);
    }

    if (typeof stored.shuffle === "boolean") {
      player.setShuffle(stored.shuffle);
    }
  };

  applyStoredPreferences();

  if (showLogo && top instanceof HTMLElement && !top.querySelector(".smooth-player__brand")) {
    brandLogo = doc.createElement("span");
    brandLogo.className = "smooth-player__brand";
    brandLogo.setAttribute("aria-hidden", "true");
    top.insertAdjacentElement("afterbegin", brandLogo);
  }

  const visualizerToggle = doc.createElement("button");
  visualizerToggle.id = "visualizer-toggle";
  visualizerToggle.type = "button";
  visualizerToggle.className = "secondary";
  const visualizerIcon = doc.createElement("span");
  visualizerIcon.className = "smooth-player__icon-visualizer";
  visualizerIcon.setAttribute("aria-hidden", "true");
  const visualizerText = doc.createElement("span");
  visualizerText.className = "smooth-player__sr-only";
  visualizerToggle.append(visualizerIcon, visualizerText);

  const stopButton = doc.createElement("button");
  stopButton.id = "stop";
  stopButton.type = "button";
  stopButton.className = "secondary";
  stopButton.setAttribute("aria-label", strings.playback.stopLabel);
  const stopIcon = doc.createElement("span");
  stopIcon.className = "smooth-player__icon-stop";
  stopIcon.setAttribute("aria-hidden", "true");
  const stopText = doc.createElement("span");
  stopText.className = "smooth-player__sr-only";
  stopText.textContent = strings.playback.stopLabel;
  stopButton.append(stopIcon, stopText);
  transport.insertBefore(stopButton, nextButton);

  const playlistTop = doc.createElement("div");
  playlistTop.className = "smooth-player__playlist-top";
  top?.append(playlistTop);
  playlistTop.append(playlistToggle, playlistTitle);
  transport.prepend(shuffleToggle);
  shuffleToggle.hidden = false;
  transport.append(visualizerToggle);

  const visualizerPanel = doc.createElement("div");
  visualizerPanel.className = "smooth-player__visualizer-panel";
  visualizerPanel.setAttribute("aria-hidden", "true");
  visualizerPanel.innerHTML = `
    <div class="smooth-player__playlist-head">
      <h2>${strings.visualizer.panelTitle}</h2>
      <button id="visualizer-close" class="smooth-player__playlist-close secondary" type="button" aria-label="${strings.visualizer.closeLabel}">
        <span aria-hidden="true">&times;</span>
        <span class="smooth-player__sr-only">${strings.visualizer.closeLabel}</span>
      </button>
    </div>
    <div class="smooth-player__visualizer-mode-row" role="tablist" aria-label="${strings.visualizer.modeLabel}">
      <button type="button" class="smooth-player__visualizer-mode" role="tab" data-mode="spectrum" aria-label="${strings.visualizer.modeSpectrum}" aria-controls="visualizer-spectrum-panel">
        <svg class="smooth-player__visualizer-mode-icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="11" width="3" height="8" rx="1"></rect>
          <rect x="10.5" y="6" width="3" height="13" rx="1"></rect>
          <rect x="17" y="9" width="3" height="10" rx="1"></rect>
        </svg>
        <span class="smooth-player__visualizer-mode-text">${strings.visualizer.modeSpectrum}</span>
      </button>
      <button type="button" class="smooth-player__visualizer-mode" role="tab" data-mode="waveform" aria-label="${strings.visualizer.modeWaveform}" aria-controls="visualizer-waveform-panel">
        <svg class="smooth-player__visualizer-mode-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 12h3l2-4 3 8 3-8 2 4h7"></path>
        </svg>
        <span class="smooth-player__visualizer-mode-text">${strings.visualizer.modeWaveform}</span>
      </button>
      <button type="button" class="smooth-player__visualizer-mode" role="tab" data-mode="none" aria-label="${strings.visualizer.modeNone}" aria-controls="visualizer-off-panel">
        <svg class="smooth-player__visualizer-mode-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="7"></circle>
          <path d="M7 17 17 7"></path>
        </svg>
        <span class="smooth-player__visualizer-mode-text">${strings.visualizer.modeNone}</span>
      </button>
    </div>
    <div id="visualizer-spectrum-panel" class="smooth-player__visualizer-spectrum-options" role="tabpanel">
      <div class="smooth-player__visualizer-spectrum-grid">
        <div class="smooth-player__visualizer-spectrum-col">
          <div class="smooth-player__visualizer-label">${strings.visualizer.effectLabel}</div>
          <label class="smooth-player__visualizer-check"><input type="checkbox" id="visualizer-effect-dual" /> ${strings.visualizer.effectDualLayer}</label>
          <label class="smooth-player__visualizer-check"><input type="checkbox" id="visualizer-effect-inverted" /> ${strings.visualizer.effectInverted}</label>
        </div>
        <div class="smooth-player__visualizer-spectrum-col">
          <div class="smooth-player__visualizer-label">${strings.visualizer.barWidthLabel}</div>
          <div class="smooth-player__visualizer-size-list" role="group" aria-label="${strings.visualizer.barWidthLabel}">
            <button type="button" class="smooth-player__visualizer-size" data-size="thin" aria-label="${strings.visualizer.barWidthThin}">
              <span class="smooth-player__size-bars smooth-player__size-bars--thin"><span></span><span></span><span></span></span>
            </button>
            <button type="button" class="smooth-player__visualizer-size" data-size="medium" aria-label="${strings.visualizer.barWidthMedium}">
              <span class="smooth-player__size-bars smooth-player__size-bars--medium"><span></span><span></span><span></span></span>
            </button>
            <button type="button" class="smooth-player__visualizer-size" data-size="large" aria-label="${strings.visualizer.barWidthLarge}">
              <span class="smooth-player__size-bars smooth-player__size-bars--large"><span></span><span></span><span></span></span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div id="visualizer-waveform-panel" class="smooth-player__visualizer-waveform-options" role="tabpanel">
      <div class="smooth-player__visualizer-label">${strings.visualizer.waveformEffectLabel}</div>
      <label class="smooth-player__visualizer-check"><input type="checkbox" id="visualizer-wave-double" /> ${strings.visualizer.waveformEffectDoubleLine}</label>
      <label class="smooth-player__visualizer-check"><input type="checkbox" id="visualizer-wave-fill" /> ${strings.visualizer.waveformEffectFill}</label>
      <label class="smooth-player__visualizer-check"><input type="checkbox" id="visualizer-wave-thick" /> ${strings.visualizer.waveformEffectThickLine}</label>
    </div>
    <div id="visualizer-off-panel" class="smooth-player__visualizer-off-options" role="tabpanel" hidden></div>
  `;
  root.append(visualizerPanel);

  const visualizerClose = visualizerPanel.querySelector("#visualizer-close") as HTMLButtonElement;
  const visualizerModeButtons = Array.from(visualizerPanel.querySelectorAll<HTMLButtonElement>(".smooth-player__visualizer-mode"));
  const spectrumOptions = visualizerPanel.querySelector(".smooth-player__visualizer-spectrum-options") as HTMLElement;
  const waveformOptions = visualizerPanel.querySelector(".smooth-player__visualizer-waveform-options") as HTMLElement;
  const offOptions = visualizerPanel.querySelector(".smooth-player__visualizer-off-options") as HTMLElement;
  const effectDual = visualizerPanel.querySelector("#visualizer-effect-dual") as HTMLInputElement;
  const effectInverted = visualizerPanel.querySelector("#visualizer-effect-inverted") as HTMLInputElement;
  const spectrumBarWidthButtons = Array.from(visualizerPanel.querySelectorAll<HTMLButtonElement>(".smooth-player__visualizer-size"));
  const waveDouble = visualizerPanel.querySelector("#visualizer-wave-double") as HTMLInputElement;
  const waveFill = visualizerPanel.querySelector("#visualizer-wave-fill") as HTMLInputElement;
  const waveThick = visualizerPanel.querySelector("#visualizer-wave-thick") as HTMLInputElement;

  const errorNotice = doc.createElement("div");
  errorNotice.className = "smooth-player__notice";
  errorNotice.setAttribute("role", "status");
  errorNotice.setAttribute("aria-live", "assertive");
  errorNotice.hidden = true;
  root.append(errorNotice);

  const showErrorNotice = (message: string): void => {
    if (!enableErrorNotice) return;
    errorNotice.textContent = message;
    errorNotice.hidden = false;
    errorNotice.classList.add("is-visible");
    if (noticeTimer) {
      window.clearTimeout(noticeTimer);
    }
    noticeTimer = window.setTimeout(() => {
      errorNotice.classList.remove("is-visible");
      errorNotice.hidden = true;
      noticeTimer = null;
    }, 6500);
  };

  const hideErrorNotice = (): void => {
    if (noticeTimer) {
      window.clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    errorNotice.classList.remove("is-visible");
    errorNotice.hidden = true;
  };

  const clearTrackInfoState = (): void => {
    title.classList.remove("is-track-exit", "is-track-enter");
    artist.classList.remove("is-track-exit", "is-track-enter");
  };

  let trackInfoTimers: Array<ReturnType<typeof setTimeout>> = [];
  const clearTrackInfoTimers = (): void => {
    for (const timer of trackInfoTimers) {
      window.clearTimeout(timer);
    }
    trackInfoTimers = [];
  };

  const renderTrackInfo = (animated: boolean): void => {
    const track = player.getCurrentTrack();
    const nextTitle = track?.metadata?.title ?? strings.track.unknownTitle;
    const nextArtist = track?.metadata?.artist ?? strings.track.unknownArtist;

    clearTrackInfoTimers();
    clearTrackInfoState();

    if (!animated) {
      title.textContent = nextTitle;
      artist.textContent = nextArtist;
      return;
    }

    title.classList.add("is-track-exit");
    trackInfoTimers.push(window.setTimeout(() => {
      artist.classList.add("is-track-exit");
    }, 70));

    trackInfoTimers.push(window.setTimeout(() => {
      title.textContent = nextTitle;
      title.classList.remove("is-track-exit");
      title.classList.add("is-track-enter");
      void title.offsetWidth;
      title.classList.remove("is-track-enter");
    }, 180));

    trackInfoTimers.push(window.setTimeout(() => {
      artist.textContent = nextArtist;
      artist.classList.remove("is-track-exit");
      artist.classList.add("is-track-enter");
      void artist.offsetWidth;
      artist.classList.remove("is-track-enter");
    }, 260));
  };

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

  const modeLabel = (mode: VisualizerMode): string => {
    if (mode === "waveform") return strings.visualizer.modeWaveform;
    if (mode === "none") return strings.visualizer.modeNone;
    return strings.visualizer.modeSpectrum;
  };

  const renderVisualizerToggle = (): void => {
    const mode = player.getVisualizer();
    const label = `${strings.visualizer.toggleLabel}: ${modeLabel(mode)}`;
    visualizerToggle.setAttribute("aria-label", label);
    visualizerToggle.setAttribute("data-mode", mode);
    visualizerToggle.setAttribute("aria-expanded", String(visualizerPanelOpen));
    visualizerText.textContent = label;
  };

  const renderTopPlaylist = (): void => {
    const playlist = player.getCurrentPlaylist();
    playlistTitle.textContent = playlist?.title ?? strings.playlist.defaultTitle;
  };

  const renderVisualizerPanel = (): void => {
    const mode = player.getVisualizer();
    const style = player.getSpectrumStyle();
    const wave = player.getWaveformStyle();
    visualizerModeButtons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    effectDual.checked = style.dualLayer;
    effectInverted.checked = style.inverted;
    spectrumBarWidthButtons.forEach((button) => {
      const size = button.dataset.size;
      const active = size === style.barWidth;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    waveDouble.checked = wave.doubleLine;
    waveFill.checked = wave.fill;
    waveThick.checked = wave.thickLine;

    const spectrumEnabled = mode === "spectrum";
    const waveformEnabled = mode === "waveform";
    const offEnabled = mode === "none";
    spectrumOptions.hidden = !spectrumEnabled;
    waveformOptions.hidden = !waveformEnabled;
    offOptions.hidden = !offEnabled;
    effectDual.disabled = !spectrumEnabled;
    effectInverted.disabled = !spectrumEnabled;
    spectrumBarWidthButtons.forEach((button) => {
      button.disabled = !spectrumEnabled;
    });
    waveDouble.disabled = !waveformEnabled;
    waveFill.disabled = !waveformEnabled;
    waveThick.disabled = !waveformEnabled;
  };

  const setVisualizerPanelOpen = (open: boolean): void => {
    const activeElement = (root.ownerDocument ?? document).activeElement;
    const focusedInsidePanel = activeElement instanceof Node && visualizerPanel.contains(activeElement);

    visualizerPanelOpen = open;
    visualizerPanel.classList.toggle("is-open", open);
    if (!open && focusedInsidePanel) {
      visualizerToggle.focus();
    }
    visualizerPanel.setAttribute("aria-hidden", String(!open));
    if (open) {
      visualizerPanel.removeAttribute("inert");
    } else {
      visualizerPanel.setAttribute("inert", "");
    }
    renderVisualizerToggle();
    if (open) {
      renderVisualizerPanel();
    }
  };

  const onVisualizerModeClick = (event: Event): void => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLButtonElement)) return;
    const mode = target.dataset.mode;
    if (mode !== "spectrum" && mode !== "waveform" && mode !== "none") return;
    player.setVisualizer(mode as VisualizerMode);
    rebuildVisualizer();
    renderVisualizerPanel();
    renderVisualizerToggle();
    persistPreferences();
  };

  const onSpectrumStyleChange = (): void => {
    const nextStyle: Partial<SpectrumStyleOptions> = {
      dualLayer: effectDual.checked,
      inverted: effectInverted.checked,
    };
    player.setSpectrumStyle(nextStyle);
    rebuildVisualizer();
    renderVisualizerPanel();
    persistPreferences();
  };

  const onSpectrumBarWidthClick = (event: Event): void => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLButtonElement)) return;
    const size = target.dataset.size;
    if (size !== "thin" && size !== "medium" && size !== "large") return;
    player.setSpectrumStyle({ barWidth: size });
    rebuildVisualizer();
    renderVisualizerPanel();
    persistPreferences();
  };

  const onWaveformStyleChange = (): void => {
    player.setWaveformStyle({
      doubleLine: waveDouble.checked,
      fill: waveFill.checked,
      thickLine: waveThick.checked,
    });
    rebuildVisualizer();
    renderVisualizerPanel();
    persistPreferences();
  };

  const onVisualizerToggle = (): void => {
    setVisualizerPanelOpen(!visualizerPanelOpen);
  };

  const onVisualizerClose = (): void => {
    setVisualizerPanelOpen(false);
  };

  const onStop = (): void => {
    player.pause();
    player.seek(0);
  };

  const onShufflePersist = (): void => {
    persistPreferences();
  };

  const onOutsidePointerDown = (event: PointerEvent): void => {
    if (!visualizerPanelOpen) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (visualizerPanel.contains(target) || visualizerToggle.contains(target)) return;
    setVisualizerPanelOpen(false);
  };

  const onEscapePanel = (event: KeyboardEvent): void => {
    if (!visualizerPanelOpen) return;
    if (event.key !== "Escape") return;
    setVisualizerPanelOpen(false);
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
    initialEnabled: player.getShuffle(),
  }));
  unmounts.push(player.mountTransportControls({
    previousButton: prevButton,
    nextButton: nextButton,
  }));
  visualizerToggle.addEventListener("click", onVisualizerToggle);
  shuffleToggle.addEventListener("click", onShufflePersist);
  visualizerClose.addEventListener("click", onVisualizerClose);
  stopButton.addEventListener("click", onStop);
  visualizerModeButtons.forEach((button) => button.addEventListener("click", onVisualizerModeClick));
  effectDual.addEventListener("change", onSpectrumStyleChange);
  effectInverted.addEventListener("change", onSpectrumStyleChange);
  spectrumBarWidthButtons.forEach((button) => button.addEventListener("click", onSpectrumBarWidthClick));
  waveDouble.addEventListener("change", onWaveformStyleChange);
  waveFill.addEventListener("change", onWaveformStyleChange);
  waveThick.addEventListener("change", onWaveformStyleChange);
  doc.addEventListener("pointerdown", onOutsidePointerDown);
  doc.addEventListener("keydown", onEscapePanel);
  if (debugEnabled) {
    const debugPanel = requiredElement<HTMLElement>(root, "#debug-panel");
    const dbgSrc = requiredElement<HTMLElement>(root, "#dbg-src");
    const dbgCurrentTime = requiredElement<HTMLElement>(root, "#dbg-current-time");
    const dbgDuration = requiredElement<HTMLElement>(root, "#dbg-duration");
    const dbgReadyState = requiredElement<HTMLElement>(root, "#dbg-ready-state");
    const dbgNetworkState = requiredElement<HTMLElement>(root, "#dbg-network-state");
    const dbgPaused = requiredElement<HTMLElement>(root, "#dbg-paused");
    const dbgEvents = requiredElement<HTMLElement>(root, "#dbg-events");

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

  player.applyTheme(root);
  renderTrackInfo(false);
  unmounts.push(player.on("trackchange", () => {
    renderTrackInfo(true);
  }));
  unmounts.push(player.mountPlayButton(playButton, {
    labelElement: playText,
    playLabel: strings.playback.playLabel,
    pauseLabel: strings.playback.pauseLabel,
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
  if (enableAudioDrop) {
    unmounts.push(player.mountAudioDrop(root));
  }
  unmounts.push(player.on("error", ({ error }) => {
    showErrorNotice(error.message);
  }));
  unmounts.push(player.on("play", hideErrorNotice));
  unmounts.push(player.on("playlistchange", renderTopPlaylist));

  const switcher = doc.createElement("div");
  switcher.className = "smooth-player__playlist-switcher";
  playlistHead.insertAdjacentElement("afterend", switcher);
  unmounts.push(player.mountPlaylistSwitcher(switcher));

  rebuildVisualizer();
  renderVisualizerToggle();
  renderVisualizerPanel();
  renderTopPlaylist();

  return {
    rebuildVisualizer,
    destroy: (): void => {
      radial?.stop();
      radial = null;
      clearTrackInfoTimers();
      clearTrackInfoState();
      hideErrorNotice();
      for (const unmount of unmounts) {
        unmount();
      }
      visualizerToggle.removeEventListener("click", onVisualizerToggle);
      shuffleToggle.removeEventListener("click", onShufflePersist);
      visualizerClose.removeEventListener("click", onVisualizerClose);
      stopButton.removeEventListener("click", onStop);
      visualizerModeButtons.forEach((button) => button.removeEventListener("click", onVisualizerModeClick));
      effectDual.removeEventListener("change", onSpectrumStyleChange);
      effectInverted.removeEventListener("change", onSpectrumStyleChange);
      spectrumBarWidthButtons.forEach((button) => button.removeEventListener("click", onSpectrumBarWidthClick));
      waveDouble.removeEventListener("change", onWaveformStyleChange);
      waveFill.removeEventListener("change", onWaveformStyleChange);
      waveThick.removeEventListener("change", onWaveformStyleChange);
      doc.removeEventListener("pointerdown", onOutsidePointerDown);
      doc.removeEventListener("keydown", onEscapePanel);
      visualizerToggle.remove();
      stopButton.remove();
      visualizerPanel.remove();
      errorNotice.remove();
      switcher.remove();
      brandLogo?.remove();
    },
  };
}
