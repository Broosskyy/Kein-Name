// Rendering-only randomness. Combat and run results never depend on this RNG.
// A fixed seed can be supplied later for reproducible visual captures.
export class VisualRandom {
  private state: number;

  constructor(seed = Date.now()) {
    this.state = seed >>> 0 || 0x6d2b79f5;
  }

  reset(seed: number): void {
    this.state = seed >>> 0 || 0x6d2b79f5;
  }

  next(): number {
    let value = this.state;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.state = value >>> 0;
    return this.state / 0x100000000;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  centered(amount = 1): number {
    return (this.next() - 0.5) * amount;
  }
}

export const visualRandom = new VisualRandom();
