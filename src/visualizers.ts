import { SmoothPlayer } from "./SmoothPlayer.js";

interface BaseVisualizerOptions {
  width?: number;
  height?: number;
  background?: string;
  color?: string;
}

export interface SpectrumVisualizerOptions extends BaseVisualizerOptions {
  barGap?: number;
  barWidth?: number;
}

export interface WaveformVisualizerOptions extends BaseVisualizerOptions {
  lineWidth?: number;
}

export interface RadialVisualizerOptions extends BaseVisualizerOptions {
  mode?: "spectrum" | "waveform";
  innerRadiusRatio?: number;
  outerRadiusRatio?: number;
  lineWidth?: number;
  waveformAmplitude?: number;
}

abstract class CanvasVisualizer {
  protected frameId = 0;

  constructor(
    protected readonly canvas: HTMLCanvasElement,
    protected readonly player: SmoothPlayer,
  ) {}

  start(): void {
    this.stop();
    this.draw();
  }

  stop(): void {
    cancelAnimationFrame(this.frameId);
  }

  protected abstract draw(): void;
}

export class CanvasSpectrumVisualizer extends CanvasVisualizer {
  private readonly options: Required<SpectrumVisualizerOptions>;

  constructor(canvas: HTMLCanvasElement, player: SmoothPlayer, options: SpectrumVisualizerOptions = {}) {
    super(canvas, player);

    this.options = {
      width: options.width ?? canvas.width ?? 640,
      height: options.height ?? canvas.height ?? 160,
      background: options.background ?? "#0b1220",
      color: options.color ?? "#2db6c8",
      barGap: options.barGap ?? 1,
      barWidth: options.barWidth ?? 3,
    };

    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
  }

  protected draw(): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    const data = this.player.getSpectrumData();
    const { width, height, background, color, barGap, barWidth } = this.options;

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    let x = 0;
    for (let i = 0; i < data.length && x < width; i += 1) {
      const value = (data[i] ?? 0) / 255;
      const barHeight = Math.max(2, value * height);

      ctx.fillStyle = color;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth + barGap;
    }

    this.frameId = requestAnimationFrame(() => this.draw());
  }
}

export class CanvasWaveformVisualizer extends CanvasVisualizer {
  private readonly options: Required<WaveformVisualizerOptions>;

  constructor(canvas: HTMLCanvasElement, player: SmoothPlayer, options: WaveformVisualizerOptions = {}) {
    super(canvas, player);

    this.options = {
      width: options.width ?? canvas.width ?? 640,
      height: options.height ?? canvas.height ?? 120,
      background: options.background ?? "#0b1220",
      color: options.color ?? "#f3f5f9",
      lineWidth: options.lineWidth ?? 2,
    };

    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
  }

  protected draw(): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    const data = this.player.getWaveformData();
    const { width, height, background, color, lineWidth } = this.options;

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i += 1) {
      const normalized = (data[i] ?? 0) / 128;
      const y = (normalized * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();

    this.frameId = requestAnimationFrame(() => this.draw());
  }
}

export class CanvasRadialVisualizer extends CanvasVisualizer {
  private readonly options: Required<RadialVisualizerOptions>;

  constructor(canvas: HTMLCanvasElement, player: SmoothPlayer, options: RadialVisualizerOptions = {}) {
    super(canvas, player);

    this.options = {
      width: options.width ?? canvas.width ?? 220,
      height: options.height ?? canvas.height ?? 220,
      background: options.background ?? "transparent",
      color: options.color ?? "#2db6c8",
      mode: options.mode ?? "spectrum",
      innerRadiusRatio: options.innerRadiusRatio ?? 0.36,
      outerRadiusRatio: options.outerRadiusRatio ?? 0.96,
      lineWidth: options.lineWidth ?? 1.4,
      waveformAmplitude: options.waveformAmplitude ?? 0.52,
    };

    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
  }

  protected draw(): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    const { width, height, background, color, mode, innerRadiusRatio, outerRadiusRatio, lineWidth, waveformAmplitude } = this.options;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2;
    const innerRadius = maxRadius * innerRadiusRatio;
    const outerRadius = maxRadius * outerRadiusRatio;
    const radialRange = Math.max(2, outerRadius - innerRadius);

    if (background === "transparent") {
      ctx.clearRect(0, 0, width, height);
    } else {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }

    if (mode === "spectrum") {
      const data = this.player.getSpectrumData();
      const sampleCount = Math.min(160, data.length);
      const step = (Math.PI * 2) / sampleCount;

      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      for (let i = 0; i < sampleCount; i += 1) {
        const value = (data[i] ?? 0) / 255;
        const amplitude = Math.max(0.04, value);
        const angle = i * step - Math.PI / 2;

        const x0 = centerX + Math.cos(angle) * innerRadius;
        const y0 = centerY + Math.sin(angle) * innerRadius;
        const x1 = centerX + Math.cos(angle) * (innerRadius + amplitude * radialRange);
        const y1 = centerY + Math.sin(angle) * (innerRadius + amplitude * radialRange);

        ctx.globalAlpha = 0.25 + amplitude * 0.75;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      this.frameId = requestAnimationFrame(() => this.draw());
      return;
    }

    const data = this.player.getWaveformData();
    const sampleCount = Math.min(220, data.length);
    const step = (Math.PI * 2) / sampleCount;
    const amplitudeRange = radialRange * waveformAmplitude;
    const baseRadius = innerRadius + radialRange * 0.5;

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();

    for (let i = 0; i < sampleCount; i += 1) {
      const normalized = ((data[i] ?? 128) - 128) / 128;
      const r = baseRadius + normalized * amplitudeRange;
      const angle = i * step - Math.PI / 2;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    this.frameId = requestAnimationFrame(() => this.draw());
  }
}
