/** Monotonic elapsed time is independent of animation frame frequency. */
export class ChallengeTimer {
  /** @param {(milliseconds: number) => void} onTick */
  constructor(onTick) {
    this.onTick = onTick;
    this.startedAt = 0;
    this.running = false;
    this.frame = 0;
  }

  start() {
    this.startedAt = performance.now();
    this.running = true;
    this.tick();
  }

  tick = () => {
    if (!this.running) return;
    this.onTick(performance.now() - this.startedAt);
    this.frame = requestAnimationFrame(this.tick);
  };

  stop() {
    const elapsed = performance.now() - this.startedAt;
    this.cancel();
    this.onTick(Math.round(elapsed));
    return elapsed;
  }

  cancel() {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }
}
