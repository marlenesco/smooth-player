import { TypedEventEmitter } from "./events.js";
import {
  type AnalyzerOptions,
  type AudioPlaylist,
  type AudioTrack,
  type DebugPanelMountOptions,
  type PlaylistEntry,
  type PlaylistMountOptions,
  type PlaylistPanelController,
  type PlaylistPanelMountOptions,
  type PlaylistSwitcherMountOptions,
  type PlaylistTitleMountOptions,
  type PlayButtonMountOptions,
  type ProgressMountOptions,
  type PlaybackState,
  type PlayerEvents,
  type SmoothPlayerOptions,
  type ShuffleToggleMountOptions,
  type TrackInfoMountOptions,
  type TransportControlsMountOptions,
  type VisualizerMode,
} from "./types.js";

interface ResolvedPlaylist {
  id: string;
  title: string;
  tracks: AudioTrack[];
}

const DEFAULT_ANALYZER: Required<AnalyzerOptions> = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
};

const DEFAULT_ACCENT_COLOR = "#0ed2a4";
const DEFAULT_PLAYLIST_ID = "default";
const DEFAULT_PLAYLIST_TITLE = "My playlist";

export class SmoothPlayer {
  private readonly audio: HTMLAudioElement;
  private readonly context: AudioContext;
  private readonly sourceNode: MediaElementAudioSourceNode;
  private readonly analyser: AnalyserNode;
  private readonly events = new TypedEventEmitter<PlayerEvents>();

  private playlists: ResolvedPlaylist[] = [];
  private activePlaylistId: string | null = null;
  private currentTrackIndex = -1;
  private visualizerMode: VisualizerMode;
  private accentColor: string;
  private shuffleEnabled: boolean;
  private debugEnabled: boolean;
  private durationFallbackEnabled: boolean;
  private resolvedDuration = Number.NaN;
  private readonly durationFallbackCache = new Map<string, number>();
  private resolvingDurationSrc: string | null = null;

  constructor(options: SmoothPlayerOptions = {}) {
    if (typeof window === "undefined") {
      throw new Error("SmoothPlayer requires a browser environment.");
    }

    this.audio = options.audio ?? new Audio();
    this.audio.crossOrigin = options.crossOrigin ?? "anonymous";
    this.audio.autoplay = options.autoplay ?? false;
    this.audio.loop = options.loop ?? false;
    this.audio.preload = this.audio.preload || "metadata";
    this.audio.volume = this.clamp(options.initialVolume ?? 1);

    this.visualizerMode = options.visualizer ?? "spectrum";
    this.accentColor = options.accentColor ?? DEFAULT_ACCENT_COLOR;
    this.shuffleEnabled = options.initialShuffle ?? false;
    this.debugEnabled = options.debug ?? false;
    this.durationFallbackEnabled = options.durationFallback ?? true;

    this.context = new AudioContext();
    this.sourceNode = this.context.createMediaElementSource(this.audio);
    this.analyser = this.context.createAnalyser();

    this.configureAnalyzer(options.analyzer);

    this.sourceNode.connect(this.analyser);
    this.analyser.connect(this.context.destination);

    this.bindAudioEvents();

    if (options.playlist?.length) {
      this.setPlaylist(options.playlist, options.initialTrackIndex ?? 0);
    } else {
      this.currentTrackIndex = options.initialTrackIndex ?? -1;
      this.emitPlaylistChange();
    }

    this.events.emit("ready", undefined);
  }

  on = this.events.on.bind(this.events);
  off = this.events.off.bind(this.events);

  destroy(): void {
    this.audio.pause();
    this.events.removeAllListeners();
    void this.context.close();
  }

  setAccentColor(color: string): void {
    this.accentColor = color;
  }

  getAccentColor(): string {
    return this.accentColor;
  }

  applyAccentColor(target: HTMLElement): void {
    target.style.setProperty("--smooth-player-accent", this.accentColor);
  }

  setShuffle(enabled: boolean): void {
    this.shuffleEnabled = enabled;
  }

  getShuffle(): boolean {
    return this.shuffleEnabled;
  }

  setDebug(enabled: boolean): void {
    this.debugEnabled = enabled;
  }

  getDebug(): boolean {
    return this.debugEnabled;
  }

  setPlaylist(entries: PlaylistEntry[], startIndex = 0): void {
    const resolved = this.resolvePlaylists(entries);
    this.playlists = resolved;

    if (!resolved.length) {
      this.activePlaylistId = null;
      this.currentTrackIndex = -1;
      this.audio.removeAttribute("src");
      this.audio.load();
      this.resolvedDuration = Number.NaN;
      this.resolvingDurationSrc = null;
      this.events.emit("trackchange", { index: -1, track: null });
      this.emitPlaylistChange();
      this.emitDurationChange();
      this.emitTimeUpdate();
      return;
    }

    const firstResolved = resolved[0];
    if (!firstResolved) return;

    const preferred = this.activePlaylistId && resolved.some((p) => p.id === this.activePlaylistId)
      ? this.activePlaylistId
      : firstResolved.id;

    this.selectPlaylist(preferred ?? firstResolved.id, startIndex);
  }

  selectPlaylist(playlistId: string, startIndex = 0): void {
    const playlist = this.playlists.find((item) => item.id === playlistId);
    if (!playlist) {
      throw new Error(`Playlist ${playlistId} not found.`);
    }

    this.activePlaylistId = playlist.id;
    this.emitPlaylistChange();

    if (!playlist.tracks.length) {
      this.currentTrackIndex = -1;
      this.events.emit("trackchange", { index: -1, track: null });
      this.emitDurationChange();
      this.emitTimeUpdate();
      return;
    }

    const safeIndex = Math.max(0, Math.min(startIndex, playlist.tracks.length - 1));
    this.loadTrackByIndex(safeIndex);
  }

  getPlaylists(): Array<{ id: string; title: string; count: number }> {
    return this.playlists.map((playlist) => ({
      id: playlist.id,
      title: playlist.title,
      count: playlist.tracks.length,
    }));
  }

  getCurrentPlaylist(): { id: string; title: string; tracks: AudioTrack[] } | null {
    const playlist = this.getActivePlaylist();
    if (!playlist) return null;
    return { id: playlist.id, title: playlist.title, tracks: [...playlist.tracks] };
  }

  getPlaylist(): AudioTrack[] {
    return [...this.getActiveTracks()];
  }

  getCurrentTrack(): AudioTrack | null {
    return this.getActiveTracks()[this.currentTrackIndex] ?? null;
  }

  getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  formatTime(value: number): string {
    if (!Number.isFinite(value) || value < 0) return "--:--";
    const m = Math.floor(value / 60).toString().padStart(2, "0");
    const s = Math.floor(value % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  mountPlaylist(container: HTMLElement, options: PlaylistMountOptions = {}): () => void {
    const settings: Required<Omit<PlaylistMountOptions, "onSelect">> = {
      listRole: options.listRole ?? "listbox",
      itemClassName: options.itemClassName ?? "smooth-player__playlist-item",
      titleClassName: options.titleClassName ?? "smooth-player__playlist-title",
      artistClassName: options.artistClassName ?? "smooth-player__playlist-artist",
      selectedAriaAttr: options.selectedAriaAttr ?? "aria-current",
      getTitle: options.getTitle ?? ((track, index) => track.metadata?.title ?? `Track ${index + 1}`),
      getArtist: options.getArtist ?? ((track) => track.metadata?.artist ?? "Unknown artist"),
    };
    const onSelect = options.onSelect;

    const render = (): void => {
      container.innerHTML = "";
      container.setAttribute("role", settings.listRole);

      const tracks = this.getActiveTracks();
      tracks.forEach((track, index) => {
        const item = document.createElement("li");
        const entry = document.createElement("div");

        entry.className = settings.itemClassName;
        entry.setAttribute("role", "option");
        entry.setAttribute("tabindex", "0");
        entry.setAttribute(settings.selectedAriaAttr, String(index === this.currentTrackIndex));

        const icon = document.createElement("span");
        icon.className = "smooth-player__playlist-note";
        icon.setAttribute("aria-hidden", "true");

        const content = document.createElement("span");
        content.className = "smooth-player__playlist-content";

        const title = document.createElement("span");
        title.className = settings.titleClassName;
        title.textContent = settings.getTitle(track, index);

        const artist = document.createElement("span");
        artist.className = settings.artistClassName;
        artist.textContent = settings.getArtist(track, index);

        content.append(title, artist);
        entry.append(icon, content);

        const activate = async (): Promise<void> => {
          await this.play(index);
          onSelect?.({ index, track });
        };

        entry.addEventListener("click", () => {
          void activate();
        });
        entry.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          void activate();
        });

        item.append(entry);
        container.append(item);
      });
    };

    render();
    const offTrackChange = this.on("trackchange", render);
    const offPlaylistChange = this.on("playlistchange", render);

    return () => {
      offTrackChange();
      offPlaylistChange();
      container.innerHTML = "";
    };
  }

  mountPlaylistSwitcher(container: HTMLElement, options: PlaylistSwitcherMountOptions = {}): () => void {
    const itemClassName = options.itemClassName ?? "smooth-player__playlist-switcher-item";
    const activeClassName = options.activeClassName ?? "is-active";
    const onSelect = options.onSelect;
    const doc = container.ownerDocument ?? document;
    let isOpen = false;

    const render = (): void => {
      const playlists = this.getPlaylists();
      container.innerHTML = "";
      container.hidden = playlists.length <= 1;
      if (container.hidden) {
        isOpen = false;
        return;
      }

      const currentPlaylist = this.getCurrentPlaylist();
      const trigger = doc.createElement("button");
      trigger.type = "button";
      trigger.className = "smooth-player__playlist-switcher-trigger";
      trigger.setAttribute("aria-haspopup", "listbox");
      trigger.setAttribute("aria-expanded", String(isOpen));
      trigger.textContent = currentPlaylist?.title ?? playlists[0]?.title ?? "Playlist";

      const menu = doc.createElement("div");
      menu.className = "smooth-player__playlist-switcher-menu";
      menu.hidden = !isOpen;
      menu.setAttribute("role", "listbox");

      playlists.forEach((playlist) => {
        const button = doc.createElement("button");
        button.type = "button";
        button.className = itemClassName;
        button.textContent = `${playlist.title} (${playlist.count})`;
        button.setAttribute("aria-pressed", String(playlist.id === this.activePlaylistId));
        button.setAttribute("role", "option");
        button.classList.toggle(activeClassName, playlist.id === this.activePlaylistId);
        button.addEventListener("click", () => {
          this.selectPlaylist(playlist.id, 0);
          onSelect?.({ id: playlist.id, title: playlist.title });
          isOpen = false;
          render();
        });
        menu.append(button);
      });

      trigger.addEventListener("click", () => {
        isOpen = !isOpen;
        render();
      });

      container.classList.toggle("is-open", isOpen);
      container.append(trigger, menu);
    };

    const onOutsidePointerDown = (event: PointerEvent): void => {
      if (!isOpen) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (container.contains(target)) return;
      isOpen = false;
      render();
    };

    const onEscape = (event: KeyboardEvent): void => {
      if (!isOpen) return;
      if (event.key !== "Escape") return;
      isOpen = false;
      render();
    };

    doc.addEventListener("pointerdown", onOutsidePointerDown);
    doc.addEventListener("keydown", onEscape);
    render();
    const offPlaylistChange = this.on("playlistchange", render);

    return () => {
      offPlaylistChange();
      doc.removeEventListener("pointerdown", onOutsidePointerDown);
      doc.removeEventListener("keydown", onEscape);
      container.innerHTML = "";
    };
  }

  mountPlaylistTitle(element: HTMLElement, options: PlaylistTitleMountOptions = {}): () => void {
    const fallbackTitle = options.fallbackTitle ?? DEFAULT_PLAYLIST_TITLE;

    const render = (): void => {
      const playlist = this.getCurrentPlaylist();
      element.textContent = playlist?.title ?? fallbackTitle;
    };

    render();
    const off = this.on("playlistchange", render);
    return () => off();
  }

  mountTrackInfo(
    titleElement: HTMLElement,
    artistElement: HTMLElement,
    options: TrackInfoMountOptions = {},
  ): () => void {
    const unknownTitle = options.unknownTitle ?? "Unknown title";
    const unknownArtist = options.unknownArtist ?? "Unknown artist";

    const render = (): void => {
      const track = this.getCurrentTrack();
      titleElement.textContent = track?.metadata?.title ?? unknownTitle;
      artistElement.textContent = track?.metadata?.artist ?? unknownArtist;
    };

    render();
    const offTrackChange = this.on("trackchange", render);
    return () => offTrackChange();
  }

  mountPlayButton(button: HTMLButtonElement, options: PlayButtonMountOptions = {}): () => void {
    const labelElement = options.labelElement ?? null;
    const playLabel = options.playLabel ?? "Riproduci";
    const pauseLabel = options.pauseLabel ?? "Pausa";

    const render = (): void => {
      const isPlaying = !this.audio.paused;
      const label = isPlaying ? pauseLabel : playLabel;
      button.setAttribute("aria-pressed", String(isPlaying));
      button.setAttribute("aria-label", label);
      if (labelElement) {
        labelElement.textContent = label;
      }
    };

    const onClick = async (): Promise<void> => {
      await this.toggle();
    };

    button.addEventListener("click", onClick);
    render();
    const offPlay = this.on("play", render);
    const offPause = this.on("pause", render);

    return () => {
      button.removeEventListener("click", onClick);
      offPlay();
      offPause();
    };
  }

  mountTransportControls(options: TransportControlsMountOptions): () => void {
    const { previousButton, nextButton } = options;
    const onPrevious = (): void => this.previous();
    const onNext = (): void => this.next();

    previousButton.addEventListener("click", onPrevious);
    nextButton.addEventListener("click", onNext);

    return () => {
      previousButton.removeEventListener("click", onPrevious);
      nextButton.removeEventListener("click", onNext);
    };
  }

  mountShuffleToggle(options: ShuffleToggleMountOptions): () => void {
    const {
      button,
      labelElement = null,
      activeClassName = "smooth-player__toggle-on",
      enabledLabel = "Disattiva shuffle",
      disabledLabel = "Attiva shuffle",
      initialEnabled = false,
    } = options;

    const render = (): void => {
      const enabled = this.getShuffle();
      const label = enabled ? enabledLabel : disabledLabel;
      button.setAttribute("aria-pressed", String(enabled));
      button.setAttribute("aria-label", label);
      button.classList.toggle(activeClassName, enabled);
      if (labelElement) {
        labelElement.textContent = label;
      }
    };

    const toggle = (): void => {
      this.setShuffle(!this.getShuffle());
      render();
    };

    this.setShuffle(initialEnabled);
    render();
    button.addEventListener("click", toggle);

    return () => {
      button.removeEventListener("click", toggle);
    };
  }

  mountPlaylistPanel(options: PlaylistPanelMountOptions): PlaylistPanelController {
    const {
      root,
      toggleButton,
      panel,
      closeButton = null,
      openClassName = "smooth-player--playlist-open",
      openLabel = "Apri playlist",
      closeLabel = "Chiudi playlist",
    } = options;

    let isOpen = false;

    const hasPlaylist = (): boolean => this.getPlaylists().length > 1 || this.getActiveTracks().length > 1;

    const syncVisibility = (): void => {
      toggleButton.hidden = !hasPlaylist();
    };

    const setOpen = (open: boolean): void => {
      if (!hasPlaylist()) {
        isOpen = false;
        root.classList.remove(openClassName);
        panel.setAttribute("aria-hidden", "true");
        toggleButton.setAttribute("aria-expanded", "false");
        toggleButton.setAttribute("aria-label", openLabel);
        return;
      }

      isOpen = open;
      root.classList.toggle(openClassName, open);
      panel.setAttribute("aria-hidden", String(!open));
      toggleButton.setAttribute("aria-expanded", String(open));
      toggleButton.setAttribute("aria-label", open ? closeLabel : openLabel);
    };

    const onToggle = (): void => setOpen(!isOpen);
    const onClose = (): void => setOpen(false);

    toggleButton.addEventListener("click", onToggle);
    closeButton?.addEventListener("click", onClose);

    const offPlaylistChange = this.on("playlistchange", () => {
      syncVisibility();
      if (!hasPlaylist()) setOpen(false);
    });

    syncVisibility();
    setOpen(false);

    return {
      setOpen,
      getOpen: (): boolean => isOpen,
      destroy: (): void => {
        offPlaylistChange();
        toggleButton.removeEventListener("click", onToggle);
        closeButton?.removeEventListener("click", onClose);
      },
    };
  }

  mountDebugPanel(options: DebugPanelMountOptions): () => void {
    const {
      enabled = this.debugEnabled,
      panel,
      sourceElement,
      currentTimeElement,
      durationElement,
      readyStateElement,
      networkStateElement,
      pausedElement,
      eventsElement,
      maxEvents = 18,
    } = options;

    const events: string[] = [];

    const log = (name: string): void => {
      if (!enabled) return;
      const line = `${new Date().toLocaleTimeString()} ${name} ct=${this.getCurrentTime().toFixed(2)} d=${this.getDuration().toFixed(2)}`;
      events.unshift(line);
      if (events.length > maxEvents) events.pop();
      eventsElement.textContent = events.join("\n");
    };

    const update = (): void => {
      if (!enabled) return;
      sourceElement.textContent = this.audio.currentSrc || this.audio.src || "-";
      currentTimeElement.textContent = Number.isFinite(this.getCurrentTime()) ? this.getCurrentTime().toFixed(3) : "NaN";
      durationElement.textContent = Number.isFinite(this.getDuration()) ? this.getDuration().toFixed(3) : "NaN";
      readyStateElement.textContent = String(this.audio.readyState);
      networkStateElement.textContent = String(this.audio.networkState);
      pausedElement.textContent = String(this.audio.paused);
    };

    panel.hidden = !enabled;

    const offPlaylist = this.on("playlistchange", () => {
      update();
      log("player:playlistchange");
    });
    const offTrack = this.on("trackchange", () => {
      update();
      log("player:trackchange");
    });
    const offPlay = this.on("play", () => {
      update();
      log("player:play");
    });
    const offPause = this.on("pause", () => {
      update();
      log("player:pause");
    });
    const offTime = this.on("timeupdate", update);
    const offDuration = this.on("durationchange", () => {
      update();
      log("player:durationchange");
    });

    update();
    log("init");

    return () => {
      offPlaylist();
      offTrack();
      offPlay();
      offPause();
      offTime();
      offDuration();
    };
  }

  mountProgress(options: ProgressMountOptions): () => void {
    const {
      range,
      currentTimeElement = null,
      durationElement = null,
      progressRoot = null,
      ringElement = null,
    } = options;

    let isScrubbing = false;
    let isRingScrubbing = false;

    const update = (): void => {
      const duration = this.getDuration();
      const currentTime = this.getCurrentTime();
      const hasDuration = Number.isFinite(duration) && duration > 0;
      const safeDuration = hasDuration ? duration : 0;
      const safeCurrentTime = hasDuration
        ? Math.max(0, Math.min(currentTime, safeDuration))
        : Math.max(0, currentTime || 0);
      const progressPercent = hasDuration ? (safeCurrentTime / safeDuration) * 100 : 0;

      range.max = String(safeDuration);
      range.value = String(safeCurrentTime);
      range.style.setProperty("--smooth-player-progress", `${progressPercent}%`);

      if (progressRoot) {
        progressRoot.style.setProperty("--smooth-player-progress", `${progressPercent}%`);
        progressRoot.style.setProperty("--smooth-player-progress-angle", `${progressPercent * 3.6}deg`);
      }

      if (currentTimeElement) {
        currentTimeElement.textContent = this.formatTime(safeCurrentTime);
      }
      if (durationElement) {
        durationElement.textContent = hasDuration ? this.formatTime(safeDuration) : "--:--";
      }
    };

    const seekTo = (valueInSeconds: number): void => {
      const duration = this.getDuration();
      if (!Number.isFinite(duration) || duration <= 0) {
        update();
        return;
      }
      const targetTime = Math.max(0, Math.min(valueInSeconds, duration));
      this.seek(targetTime);
      update();
    };

    const seekFromRingPointer = (clientX: number, clientY: number): void => {
      if (!ringElement) return;
      const duration = this.getDuration();
      if (!Number.isFinite(duration) || duration <= 0) return;

      const rect = ringElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (angle < 0) angle += 360;

      seekTo((angle / 360) * duration);
    };

    const onRangePointerDown = (): void => {
      isScrubbing = true;
    };

    const onRangeInput = (event: Event): void => {
      isScrubbing = true;
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      seekTo(Number(target.value));
    };

    const onRangeChange = (event: Event): void => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      seekTo(Number(target.value));
      isScrubbing = false;
    };

    const onRingPointerDown = (event: PointerEvent): void => {
      isRingScrubbing = true;
      seekFromRingPointer(event.clientX, event.clientY);
    };

    const onPointerMove = (event: PointerEvent): void => {
      if (!isRingScrubbing) return;
      seekFromRingPointer(event.clientX, event.clientY);
    };

    const onPointerUp = (): void => {
      isScrubbing = false;
      isRingScrubbing = false;
    };

    range.addEventListener("pointerdown", onRangePointerDown);
    range.addEventListener("input", onRangeInput);
    range.addEventListener("change", onRangeChange);
    if (ringElement) {
      ringElement.addEventListener("pointerdown", onRingPointerDown);
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    const offTimeUpdate = this.on("timeupdate", () => {
      if (!isScrubbing) update();
    });
    const offDurationChange = this.on("durationchange", () => {
      if (!isScrubbing) update();
    });

    update();

    return () => {
      range.removeEventListener("pointerdown", onRangePointerDown);
      range.removeEventListener("input", onRangeInput);
      range.removeEventListener("change", onRangeChange);
      if (ringElement) {
        ringElement.removeEventListener("pointerdown", onRingPointerDown);
      }
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      offTimeUpdate();
      offDurationChange();
    };
  }

  async play(index?: number): Promise<void> {
    if (typeof index === "number") {
      this.loadTrackByIndex(index);
    }

    if (!this.audio.src) {
      throw new Error("No track loaded. Use playlist option, setPlaylist(), or loadTrack().");
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    await this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  toggle(): Promise<void> {
    if (this.audio.paused) {
      return this.play();
    }

    this.pause();
    return Promise.resolve();
  }

  next(): void {
    const tracks = this.getActiveTracks();
    if (!tracks.length) return;

    if (this.shuffleEnabled && tracks.length > 1) {
      const randomIndex = this.pickRandomTrackIndex(tracks.length);
      this.loadTrackByIndex(randomIndex);
      void this.play();
      return;
    }

    const nextIndex = this.currentTrackIndex + 1;
    if (nextIndex >= tracks.length) {
      this.events.emit("ended", undefined);
      return;
    }

    this.loadTrackByIndex(nextIndex);
    void this.play();
  }

  previous(): void {
    const tracks = this.getActiveTracks();
    if (!tracks.length) return;

    const prevIndex = Math.max(this.currentTrackIndex - 1, 0);
    this.loadTrackByIndex(prevIndex);
    void this.play();
  }

  setLoop(loop: boolean): void {
    this.audio.loop = loop;
  }

  setVolume(volume: number): void {
    const safeVolume = this.clamp(volume);
    this.audio.volume = safeVolume;
    this.events.emit("volumechange", { volume: safeVolume });
  }

  seek(seconds: number): void {
    const duration = this.getDuration();
    const safeSeconds = Number.isFinite(duration) && duration > 0
      ? Math.max(0, Math.min(seconds, duration))
      : Math.max(0, seconds);
    this.audio.currentTime = safeSeconds;
    this.emitTimeUpdate();
  }

  loadTrack(track: AudioTrack): void {
    const playlist = this.getActivePlaylist();
    if (!playlist) {
      this.setPlaylist([track], 0);
      return;
    }

    const existingIndex = playlist.tracks.findIndex((item) => item.id === track.id);
    if (existingIndex >= 0) {
      this.loadTrackByIndex(existingIndex);
      return;
    }

    playlist.tracks.push(track);
    this.loadTrackByIndex(playlist.tracks.length - 1);
    this.emitPlaylistChange();
  }

  getState(): PlaybackState {
    const playlist = this.getActivePlaylist();
    return {
      currentTrackIndex: this.currentTrackIndex,
      isPlaying: !this.audio.paused,
      duration: this.getDuration(),
      currentTime: this.audio.currentTime,
      volume: this.audio.volume,
      loop: this.audio.loop,
      playlistId: playlist?.id ?? null,
      playlistTitle: playlist?.title ?? DEFAULT_PLAYLIST_TITLE,
      playlistCount: this.playlists.length,
      visualizer: this.visualizerMode,
      accentColor: this.accentColor,
      shuffle: this.shuffleEnabled,
    };
  }

  getAudioElement(): HTMLAudioElement {
    return this.audio;
  }

  getCurrentTime(): number {
    return this.audio.currentTime;
  }

  getDuration(): number {
    const nativeDuration = this.audio.duration;
    if (Number.isFinite(nativeDuration) && nativeDuration > 0) {
      return nativeDuration;
    }

    if (Number.isFinite(this.resolvedDuration) && this.resolvedDuration > 0) {
      return this.resolvedDuration;
    }

    return 0;
  }

  getSpectrumData(): Uint8Array {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    if (this.visualizerMode !== "spectrum") {
      return data;
    }
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getWaveformData(): Uint8Array {
    const data = new Uint8Array(this.analyser.fftSize);
    if (this.visualizerMode !== "waveform") {
      return data;
    }
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  setVisualizer(mode: VisualizerMode): void {
    this.visualizerMode = mode;
  }

  getVisualizer(): VisualizerMode {
    return this.visualizerMode;
  }

  configureAnalyzer(options: AnalyzerOptions = {}): void {
    const config = { ...DEFAULT_ANALYZER, ...options };
    this.analyser.fftSize = config.fftSize;
    this.analyser.smoothingTimeConstant = config.smoothingTimeConstant;
    this.analyser.minDecibels = config.minDecibels;
    this.analyser.maxDecibels = config.maxDecibels;
  }

  private getActivePlaylist(): ResolvedPlaylist | null {
    if (!this.activePlaylistId) return null;
    return this.playlists.find((playlist) => playlist.id === this.activePlaylistId) ?? null;
  }

  private getActiveTracks(): AudioTrack[] {
    return this.getActivePlaylist()?.tracks ?? [];
  }

  private loadTrackByIndex(index: number): void {
    const tracks = this.getActiveTracks();
    const track = tracks[index];
    if (!track) {
      throw new Error(`Track index ${index} out of bounds.`);
    }

    this.currentTrackIndex = index;
    this.audio.src = track.src;
    this.audio.load();
    this.resolvedDuration = Number.NaN;
    this.resolvingDurationSrc = null;

    this.events.emit("trackchange", { index, track });
    this.emitDurationChange();
    this.emitTimeUpdate();
    this.syncDurationFromAudio();
  }

  private emitPlaylistChange(): void {
    const playlist = this.getActivePlaylist();
    this.events.emit("playlistchange", {
      id: playlist?.id ?? null,
      title: playlist?.title ?? DEFAULT_PLAYLIST_TITLE,
      index: this.currentTrackIndex,
    });
  }

  private bindAudioEvents(): void {
    this.audio.addEventListener("play", () => this.events.emit("play", undefined));
    this.audio.addEventListener("pause", () => this.events.emit("pause", undefined));
    this.audio.addEventListener("loadedmetadata", () => this.syncDurationFromAudio());
    this.audio.addEventListener("durationchange", () => this.syncDurationFromAudio());
    this.audio.addEventListener("canplay", () => this.syncDurationFromAudio());
    this.audio.addEventListener("loadeddata", () => this.syncDurationFromAudio());
    this.audio.addEventListener("seeked", () => this.emitTimeUpdate());
    this.audio.addEventListener("timeupdate", () => this.emitTimeUpdate());
    this.audio.addEventListener("ended", () => {
      if (this.getActiveTracks().length > 1 && !this.audio.loop) {
        this.next();
        return;
      }
      this.events.emit("ended", undefined);
    });
    this.audio.addEventListener("error", () => {
      this.events.emit("error", {
        error: new Error("Audio playback failed."),
      });
    });
  }

  private clamp(value: number): number {
    return Math.min(1, Math.max(0, value));
  }

  private pickRandomTrackIndex(length: number): number {
    if (length <= 1) return 0;

    let randomIndex = this.currentTrackIndex;
    while (randomIndex === this.currentTrackIndex) {
      randomIndex = Math.floor(Math.random() * length);
    }

    return randomIndex;
  }

  private emitTimeUpdate(): void {
    this.events.emit("timeupdate", {
      currentTime: this.audio.currentTime,
      duration: this.getDuration(),
    });
  }

  private emitDurationChange(): void {
    this.events.emit("durationchange", { duration: this.getDuration() });
  }

  private syncDurationFromAudio(): void {
    const nativeDuration = this.audio.duration;
    if (Number.isFinite(nativeDuration) && nativeDuration > 0) {
      this.resolvedDuration = nativeDuration;
      this.emitDurationChange();
      this.emitTimeUpdate();
      return;
    }

    if (!this.durationFallbackEnabled) {
      this.emitDurationChange();
      this.emitTimeUpdate();
      return;
    }

    void this.resolveDurationFallback();
  }

  private async resolveDurationFallback(): Promise<void> {
    const track = this.getCurrentTrack();
    const src = track?.src ?? this.audio.currentSrc ?? this.audio.src;
    if (!src) return;

    if (this.durationFallbackCache.has(src)) {
      this.resolvedDuration = this.durationFallbackCache.get(src) ?? Number.NaN;
      this.emitDurationChange();
      this.emitTimeUpdate();
      return;
    }

    if (this.resolvingDurationSrc === src) {
      return;
    }
    this.resolvingDurationSrc = src;

    try {
      const response = await fetch(src);
      if (!response.ok) {
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const decoded = await this.context.decodeAudioData(arrayBuffer.slice(0));
      const duration = decoded.duration;
      if (!Number.isFinite(duration) || duration <= 0) {
        return;
      }

      if (src !== (this.getCurrentTrack()?.src ?? this.audio.currentSrc ?? this.audio.src)) {
        return;
      }

      this.durationFallbackCache.set(src, duration);
      this.resolvedDuration = duration;
      this.emitDurationChange();
      this.emitTimeUpdate();
    } catch {
      // ignore: keep unresolved duration when decode fails
    } finally {
      if (this.resolvingDurationSrc === src) {
        this.resolvingDurationSrc = null;
      }
    }
  }

  private resolvePlaylists(entries: PlaylistEntry[]): ResolvedPlaylist[] {
    if (!entries.length) return [];

    const namedPlaylists: ResolvedPlaylist[] = [];

    const directRootTracks = this.collectDirectTracks(entries);
    if (directRootTracks.length) {
      namedPlaylists.push({
        id: DEFAULT_PLAYLIST_ID,
        title: DEFAULT_PLAYLIST_TITLE,
        tracks: directRootTracks,
      });
    }

    this.collectNestedPlaylists(entries, namedPlaylists);

    if (!namedPlaylists.length) {
      const fallbackTracks = this.flattenTracks(entries);
      if (!fallbackTracks.length) return [];
      namedPlaylists.push({
        id: DEFAULT_PLAYLIST_ID,
        title: DEFAULT_PLAYLIST_TITLE,
        tracks: fallbackTracks,
      });
    }

    return this.dedupePlaylistIds(namedPlaylists);
  }

  private collectDirectTracks(entries: PlaylistEntry[]): AudioTrack[] {
    const tracks: AudioTrack[] = [];
    for (const entry of entries) {
      if (!this.isAudioPlaylist(entry)) {
        tracks.push(entry);
      }
    }
    return tracks;
  }

  private flattenTracks(entries: PlaylistEntry[]): AudioTrack[] {
    const tracks: AudioTrack[] = [];
    for (const entry of entries) {
      if (this.isAudioPlaylist(entry)) {
        tracks.push(...this.flattenTracks(entry.tracks));
      } else {
        tracks.push(entry);
      }
    }
    return tracks;
  }

  private collectNestedPlaylists(entries: PlaylistEntry[], target: ResolvedPlaylist[]): void {
    for (const entry of entries) {
      if (!this.isAudioPlaylist(entry)) continue;

      const tracks = this.flattenTracks(entry.tracks);
      if (tracks.length) {
        target.push({ id: entry.id, title: entry.title, tracks });
      }

      this.collectNestedPlaylists(entry.tracks, target);
    }
  }

  private dedupePlaylistIds(playlists: ResolvedPlaylist[]): ResolvedPlaylist[] {
    const seen = new Set<string>();
    const deduped: ResolvedPlaylist[] = [];

    for (const playlist of playlists) {
      let id = playlist.id || DEFAULT_PLAYLIST_ID;
      if (seen.has(id)) {
        let suffix = 2;
        while (seen.has(`${id}-${suffix}`)) suffix += 1;
        id = `${id}-${suffix}`;
      }
      seen.add(id);
      deduped.push({ ...playlist, id });
    }

    return deduped;
  }

  private isAudioPlaylist(entry: PlaylistEntry): entry is AudioPlaylist {
    return "tracks" in entry && Array.isArray(entry.tracks);
  }
}
