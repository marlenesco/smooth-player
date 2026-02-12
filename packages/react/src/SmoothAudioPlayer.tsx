import { useEffect, useMemo, useRef, useState } from "react";
import {
  SmoothPlayer,
  CanvasSpectrumVisualizer,
  CanvasWaveformVisualizer,
  type AudioTrack,
  type VisualizerMode,
} from "smooth-player";
import prevIcon from "smooth-player/assets/icons/prev.svg";
import nextIcon from "smooth-player/assets/icons/next.svg";
import playIcon from "smooth-player/assets/icons/play.svg";
import pauseIcon from "smooth-player/assets/icons/pause.svg";

export interface SmoothAudioPlayerProps {
  tracks: AudioTrack[];
  accentColor?: string;
  visualizer?: VisualizerMode;
  initialVolume?: number;
}

export function SmoothAudioPlayer({
  tracks,
  accentColor = "#0ed2a4",
  visualizer = "spectrum",
  initialVolume = 0.8,
}: SmoothAudioPlayerProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const spectrumRef = useRef<HTMLCanvasElement | null>(null);
  const waveformRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<SmoothPlayer | null>(null);

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentTrack = tracks[index] ?? null;
  const showPlaylist = tracks.length > 1;

  useEffect(() => {
    const player = new SmoothPlayer({ initialVolume, visualizer, accentColor });
    player.setPlaylist(tracks, 0);
    playerRef.current = player;

    let spectrum: CanvasSpectrumVisualizer | null = null;
    let waveform: CanvasWaveformVisualizer | null = null;

    if (visualizer === "spectrum") {
      spectrum = new CanvasSpectrumVisualizer(spectrumRef.current!, player, { color: "#3cc8d9" });
      spectrum.start();
    }

    if (visualizer === "waveform") {
      waveform = new CanvasWaveformVisualizer(waveformRef.current!, player, { color: "#e7f0ff" });
      waveform.start();
    }

    const offTrack = player.on("trackchange", ({ index: nextIndex }) => setIndex(nextIndex));
    const offPlay = player.on("play", () => setIsPlaying(true));
    const offPause = player.on("pause", () => setIsPlaying(false));

    return () => {
      offTrack();
      offPlay();
      offPause();
      spectrum?.stop();
      waveform?.stop();
      player.destroy();
    };
  }, [tracks, initialVolume, visualizer, accentColor]);

  useEffect(() => {
    const player = playerRef.current;
    const root = rootRef.current;
    if (!player || !root) return;
    player.setAccentColor(accentColor);
    player.applyAccentColor(root);
  }, [accentColor]);

  const handlers = useMemo(() => ({
    toggle: async () => {
      await playerRef.current?.toggle();
    },
    previous: () => playerRef.current?.previous(),
    next: () => playerRef.current?.next(),
    pick: async (nextIndex: number) => {
      await playerRef.current?.play(nextIndex);
    },
  }), []);

  return (
    <section ref={rootRef} className="smooth-player">
      <div className="smooth-player__main">
        <div className="smooth-player__row">
          <h2 className="smooth-player__title">Smooth Player</h2>
          <div className="smooth-player__controls">
            <button className="secondary" onClick={handlers.previous} aria-label="Previous">
              <img className="smooth-player__icon" src={prevIcon} alt="" />
            </button>
            <button onClick={handlers.toggle} aria-label={isPlaying ? "Pause" : "Play"}>
              <img
                className="smooth-player__icon"
                src={isPlaying ? pauseIcon : playIcon}
                alt=""
              />
            </button>
            <button className="secondary" onClick={handlers.next} aria-label="Next">
              <img className="smooth-player__icon" src={nextIcon} alt="" />
            </button>
          </div>
        </div>

        <div className="smooth-player__meta">
          <strong>{currentTrack?.metadata?.title ?? "Unknown title"}</strong>
          <div className="smooth-player__artist">{currentTrack?.metadata?.artist ?? "Unknown artist"}</div>
        </div>

        <canvas ref={spectrumRef} id="spectrum" className="smooth-player__canvas" width={860} height={180} hidden={visualizer !== "spectrum"} />
        <canvas ref={waveformRef} id="waveform" className="smooth-player__canvas" width={860} height={120} hidden={visualizer !== "waveform"} />
      </div>

      {showPlaylist ? (
        <aside className="smooth-player__playlist" aria-hidden="false">
          <div className="smooth-player__playlist-head"><h2>Playlist</h2></div>
          <ul className="smooth-player__playlist-list">
            {tracks.map((track, listIndex) => (
              <li key={track.id}>
                <button
                  className="smooth-player__playlist-item"
                  aria-current={listIndex === index ? "true" : undefined}
                  onClick={() => handlers.pick(listIndex)}
                >
                  <span className="smooth-player__playlist-title">{track.metadata?.title ?? track.id}</span>
                  <span className="smooth-player__playlist-artist">{track.metadata?.artist ?? "Unknown artist"}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </section>
  );
}
