import { en } from "./en.generated.js";

export interface SmoothPlayerStrings {
  playlist: {
    defaultId: string;
    defaultTitle: string;
    triggerLabel: string;
    openLabel: string;
    closeLabel: string;
  };
  playback: {
    playLabel: string;
    pauseLabel: string;
    stopLabel: string;
  };
  shuffle: {
    enabledLabel: string;
    disabledLabel: string;
  };
  visualizer: {
    toggleLabel: string;
    panelTitle: string;
    closeLabel: string;
    modeLabel: string;
    effectLabel: string;
    effectDualLayer: string;
    effectInverted: string;
    barWidthLabel: string;
    barWidthThin: string;
    barWidthMedium: string;
    barWidthLarge: string;
    waveformEffectLabel: string;
    waveformEffectDoubleLine: string;
    waveformEffectFill: string;
    waveformEffectThickLine: string;
    modeSpectrum: string;
    modeWaveform: string;
    modeNone: string;
  };
  track: {
    unknownTitle: string;
    unknownArtist: string;
    localFileArtist: string;
    m3uArtist: string;
  };
  errors: {
    noTrackLoaded: string;
    noPlayableTracksDropped: string;
    audioPlaybackFailed: string;
    corsBlocked: string;
  };
}

export const strings: SmoothPlayerStrings = en;
