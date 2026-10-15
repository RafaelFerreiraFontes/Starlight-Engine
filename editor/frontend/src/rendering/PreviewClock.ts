/** Fixed visual ticks only. Never persisted and never advances gameplay. */
export class PreviewClock {
  private accumulator = 0;
  private current = 0;
  private running = false;
  readonly fps = 60;
  readonly maxCatchupSteps = 8;
  constructor(readonly seed = 23023, readonly maxParticles = 96) {
    if (!Number.isInteger(seed) || !Number.isInteger(maxParticles) || maxParticles < 0 || maxParticles > 256) throw new Error('Invalid preview budget');
  }
  get frame() { return this.current; }
  get seconds() { return this.current / this.fps; }
  get playing() { return this.running; }
  play() { this.running = true; }
  pause() { this.running = false; this.accumulator = 0; }
  reset() { this.pause(); this.current = 0; }
  step() { this.pause(); this.current++; }
  advance(deltaMs: number) {
    if (!this.running || !Number.isFinite(deltaMs) || deltaMs < 0) return;
    this.accumulator += Math.min(deltaMs, 1000 / this.fps * this.maxCatchupSteps);
    const steps = Math.min(this.maxCatchupSteps, Math.floor((this.accumulator + 1e-7) / (1000 / this.fps)));
    this.current += steps;
    this.accumulator -= steps * 1000 / this.fps;
  }
  /** Stateless sample: same seed/frame/index always yields the same visual. */
  static sample(seed: number, frame: number, index: number) {
    let value = (seed ^ Math.imul(frame + 1, 374761393) ^ Math.imul(index + 1, 668265263)) >>> 0;
    value = Math.imul(value ^ value >>> 13, 1274126177);
    return ((value ^ value >>> 16) >>> 0) / 4294967296;
  }
}
