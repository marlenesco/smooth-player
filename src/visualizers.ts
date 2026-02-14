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

function withAlpha(color: string, alpha: number): string {
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  const hex = color.trim();
  if (/^#[\da-f]{3}$/i.test(hex)) {
    const rChar = hex.charAt(1);
    const gChar = hex.charAt(2);
    const bChar = hex.charAt(3);
    const r = parseInt(rChar + rChar, 16);
    const g = parseInt(gChar + gChar, 16);
    const b = parseInt(bChar + bChar, 16);
    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
  }
  if (/^#[\da-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
  }

  const rgbMatch = hex.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1]?.split(",").map((part) => part.trim()) ?? [];
    const r = Number(parts[0] ?? 255);
    const g = Number(parts[1] ?? 255);
    const b = Number(parts[2] ?? 255);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
    }
  }

  return color;
}

export class CanvasSpectrumVisualizer extends CanvasVisualizer {
  private readonly options: Required<SpectrumVisualizerOptions>;
  private ghostHeights: number[] = [];

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
    const style = this.player.getSpectrumStyle();
    const isActive = !this.player.getAudioElement().paused;

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    if (!isActive) {
      this.frameId = requestAnimationFrame(() => this.draw());
      return;
    }

    let x = 0;
    for (let i = 0; i < data.length && x < width; i += 1) {
      const value = (data[i] ?? 0) / 255;
      const barHeight = Math.max(2, value * height);
      const baseY = style.inverted ? 0 : height;
      const clampedHeight = barHeight;

      if (style.dualLayer) {
        const previous = this.ghostHeights[i] ?? clampedHeight;
        const ghostHeight = previous * 0.88 + clampedHeight * 0.12;
        this.ghostHeights[i] = ghostHeight;
        ctx.globalAlpha = 0.34;
        this.drawBar(ctx, x, baseY, barWidth, barGap, ghostHeight, color, style);
      }

      ctx.globalAlpha = 0.94;
      this.drawBar(ctx, x, baseY, barWidth, barGap, clampedHeight, color, style);
      x += barWidth + barGap;
    }
    ctx.globalAlpha = 1;
    if (this.ghostHeights.length > data.length) {
      this.ghostHeights = this.ghostHeights.slice(0, data.length);
    }

    this.frameId = requestAnimationFrame(() => this.draw());
  }

  private drawBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    baseY: number,
    width: number,
    gap: number,
    height: number,
    color: string,
    style: ReturnType<SmoothPlayer["getSpectrumStyle"]>,
  ): void {
    const widthFactor = style.barWidth === "thin"
      ? 1.9
      : style.barWidth === "medium"
        ? 5.7
        : 17.1;
    const maxDrawWidth = Math.max(1, width + gap - 1.8);
    const drawWidth = Math.max(1, Math.min(width * widthFactor, maxDrawWidth));
    const drawX = x - (drawWidth - width) / 2;
    const topY = style.inverted ? baseY : baseY - height;

    ctx.fillStyle = color;
    ctx.fillRect(drawX, topY, drawWidth, height);

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
    const isActive = !this.player.getAudioElement().paused;

    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    if (!isActive) {
      this.frameId = requestAnimationFrame(() => this.draw());
      return;
    }

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
    const isActive = !this.player.getAudioElement().paused;
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
    if (!isActive) {
      this.frameId = requestAnimationFrame(() => this.draw());
      return;
    }

    if (mode === "spectrum") {
      const data = this.player.getSpectrumData();
      const spectrumStyle = this.player.getSpectrumStyle();
      const sampleCount = Math.min(
        spectrumStyle.barWidth === "thin"
          ? 136
          : spectrumStyle.barWidth === "medium"
            ? 114
            : 92,
        data.length,
      );
      const step = (Math.PI * 2) / sampleCount;

      const widthFactor = spectrumStyle.barWidth === "thin"
        ? 2.05
        : spectrumStyle.barWidth === "medium"
          ? 6.15
          : 18.45;
      const ringCircumference = Math.PI * 2 * outerRadius;
      const targetGap = spectrumStyle.barWidth === "thin"
        ? 2.2
        : spectrumStyle.barWidth === "medium"
          ? 4.2
          : 6.8;
      const maxStrokeForGap = Math.max(1, ringCircumference / sampleCount - targetGap);
      ctx.lineWidth = Math.min(lineWidth * widthFactor, maxStrokeForGap);
      ctx.lineCap = "round";
      ctx.strokeStyle = color;

      for (let i = 0; i < sampleCount; i += 1) {
        const value = (data[i] ?? 0) / 255;
        const amplitude = Math.max(0.04, value);
        const angle = i * step - Math.PI / 2;

        const outwardStart = innerRadius;
        const outwardEnd = outwardStart + amplitude * radialRange;
        const inwardStart = outerRadius;
        const inwardEnd = Math.max(innerRadius, inwardStart - amplitude * radialRange);
        const startRadius = spectrumStyle.inverted ? inwardStart : outwardStart;
        const primaryEndRadius = spectrumStyle.inverted ? inwardEnd : outwardEnd;
        const x0 = centerX + Math.cos(angle) * startRadius;
        const y0 = centerY + Math.sin(angle) * startRadius;
        const x1 = centerX + Math.cos(angle) * primaryEndRadius;
        const y1 = centerY + Math.sin(angle) * primaryEndRadius;

        ctx.globalAlpha = 0.25 + amplitude * 0.75;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        if (spectrumStyle.dualLayer) {
          const altStart = spectrumStyle.inverted ? outwardStart : inwardStart;
          const altEnd = spectrumStyle.inverted ? outwardEnd : inwardEnd;
          const inverseAngle = -i * step - Math.PI / 2;
          const ax0 = centerX + Math.cos(inverseAngle) * altStart;
          const ay0 = centerY + Math.sin(inverseAngle) * altStart;
          const ax1 = centerX + Math.cos(inverseAngle) * altEnd;
          const ay1 = centerY + Math.sin(inverseAngle) * altEnd;
          ctx.globalAlpha = 0.18 + amplitude * 0.52;
          ctx.beginPath();
          ctx.moveTo(ax0, ay0);
          ctx.lineTo(ax1, ay1);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      this.frameId = requestAnimationFrame(() => this.draw());
      return;
    }

    const data = this.player.getWaveformData();
    const waveformStyle = this.player.getWaveformStyle();
    const sampleCount = Math.min(220, data.length);
    const step = (Math.PI * 2) / sampleCount;
    const amplitudeRange = radialRange * waveformAmplitude;
    const baseRadius = innerRadius + radialRange * 0.5;

    ctx.lineWidth = waveformStyle.thickLine ? lineWidth * 2.25 : lineWidth;
    ctx.strokeStyle = color;
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

    if (waveformStyle.fill) {
      const fillGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        Math.max(1, innerRadius * 0.12),
        centerX,
        centerY,
        Math.max(innerRadius + radialRange * 0.65, 2),
      );
      fillGradient.addColorStop(0, withAlpha(color, 0));
      fillGradient.addColorStop(0.58, withAlpha(color, 0.08));
      fillGradient.addColorStop(1, withAlpha(color, 0.24));
      ctx.globalAlpha = 1;
      ctx.fillStyle = fillGradient;
      ctx.fill();
    }

    if (waveformStyle.doubleLine) {
      ctx.globalAlpha = 0.42;
      ctx.lineWidth = Math.max(1, ctx.lineWidth * 0.72);
      ctx.beginPath();
      for (let i = 0; i < sampleCount; i += 1) {
        const normalized = ((data[i] ?? 128) - 128) / 128;
        const r = baseRadius + normalized * amplitudeRange * 0.72 + radialRange * 0.1;
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
    }

    ctx.globalAlpha = 1;
    this.frameId = requestAnimationFrame(() => this.draw());
  }
}
