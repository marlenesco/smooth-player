export type VisualizerMode = "spectrum" | "waveform" | "none";

export interface SpectrumStyleOptions {
  dualLayer: boolean;
  inverted: boolean;
  barWidth: "thin" | "medium" | "large";
}

export interface WaveformStyleOptions {
  doubleLine: boolean;
  fill: boolean;
  thickLine: boolean;
}

export interface TrackMetadata {
  title?: string;
  artist?: string;
  album?: string;
  albumArtUrl?: string;
  year?: string | number;
  genre?: string;
  [key: string]: unknown;
}

export interface AudioTrack {
  id: string;
  src: string;
  type?: string;
  metadata?: TrackMetadata;
}

export interface AudioPlaylist {
  id: string;
  title: string;
  tracks: PlaylistEntry[];
}

export type PlaylistEntry = AudioTrack | AudioPlaylist;

export interface AnalyzerOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
}

export interface PlaylistMountOptions {
  listRole?: string;
  itemClassName?: string;
  titleClassName?: string;
  artistClassName?: string;
  selectedAriaAttr?: string;
  getTitle?: (track: AudioTrack, index: number) => string;
  getArtist?: (track: AudioTrack, index: number) => string;
  onSelect?: (payload: { index: number; track: AudioTrack }) => void;
}

export interface PlaylistSwitcherMountOptions {
  itemClassName?: string;
  activeClassName?: string;
  onSelect?: (payload: { id: string; title: string }) => void;
}

export interface TrackInfoMountOptions {
  unknownTitle?: string;
  unknownArtist?: string;
}

export interface PlaylistTitleMountOptions {
  fallbackTitle?: string;
}

export interface PlayButtonMountOptions {
  labelElement?: HTMLElement | null;
  playLabel?: string;
  pauseLabel?: string;
}

export interface ProgressMountOptions {
  range: HTMLInputElement;
  currentTimeElement?: HTMLElement | null;
  durationElement?: HTMLElement | null;
  progressRoot?: HTMLElement | null;
  ringElement?: HTMLElement | null;
}

export interface TransportControlsMountOptions {
  previousButton: HTMLElement;
  nextButton: HTMLElement;
}

export interface ShuffleToggleMountOptions {
  button: HTMLButtonElement;
  labelElement?: HTMLElement | null;
  activeClassName?: string;
  enabledLabel?: string;
  disabledLabel?: string;
  initialEnabled?: boolean;
}

export interface PlaylistPanelMountOptions {
  root: HTMLElement;
  toggleButton: HTMLButtonElement;
  panel: HTMLElement;
  closeButton?: HTMLElement | null;
  openClassName?: string;
  openLabel?: string;
  closeLabel?: string;
}

export interface PlaylistPanelController {
  destroy: () => void;
  getOpen: () => boolean;
  setOpen: (open: boolean) => void;
}

export interface AudioDropMountOptions {
  activeClassName?: string;
  onDrop?: (payload: { file: File; track: AudioTrack; tracks: AudioTrack[]; kind: "audio" | "playlist" }) => void;
}

export interface DebugPanelMountOptions {
  enabled?: boolean;
  panel: HTMLElement;
  sourceElement: HTMLElement;
  currentTimeElement: HTMLElement;
  durationElement: HTMLElement;
  readyStateElement: HTMLElement;
  networkStateElement: HTMLElement;
  pausedElement: HTMLElement;
  eventsElement: HTMLElement;
  maxEvents?: number;
}

export interface StandardPlayerUIMountOptions {
  debugEnabled?: boolean;
  enableAudioDrop?: boolean;
  enableErrorNotice?: boolean;
  showLogo?: boolean;
  persistUserPreferences?: boolean;
  userPreferencesCookieName?: string;
  userPreferencesMaxAgeDays?: number;
}

export interface StandardPlayerUIController {
  destroy: () => void;
  rebuildVisualizer: () => void;
}

export interface SmoothPlayerOptions {
  audio?: HTMLAudioElement;
  autoplay?: boolean;
  loop?: boolean;
  debug?: boolean;
  crossOrigin?: HTMLMediaElement["crossOrigin"];
  playlist?: PlaylistEntry[];
  initialVolume?: number;
  initialTrackIndex?: number;
  accentColor?: string;
  backgroundColor?: string;
  analyzer?: AnalyzerOptions;
  visualizer?: VisualizerMode;
  spectrumStyle?: Partial<SpectrumStyleOptions>;
  waveformStyle?: Partial<WaveformStyleOptions>;
  initialShuffle?: boolean;
  durationFallback?: boolean;
}

export interface PlaybackState {
  currentTrackIndex: number;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  loop: boolean;
  playlistId: string | null;
  playlistTitle: string;
  playlistCount: number;
  visualizer: VisualizerMode;
  spectrumStyle: SpectrumStyleOptions;
  waveformStyle: WaveformStyleOptions;
  accentColor: string;
  backgroundColor: string;
  shuffle: boolean;
}

export interface PlayerEvents {
  ready: undefined;
  play: undefined;
  pause: undefined;
  ended: undefined;
  playlistchange: { id: string | null; title: string; index: number };
  trackchange: { index: number; track: AudioTrack | null };
  durationchange: { duration: number };
  timeupdate: { currentTime: number; duration: number };
  volumechange: { volume: number };
  error: { error: Error };
}
