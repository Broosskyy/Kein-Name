export type SoundCue =
  | 'normalAttack' | 'powerHit' | 'bossImpact' | 'bossBreak'
  | 'pumpkinShot' | 'pumpkinImpact' | 'eventBossBreak' | 'eventBossKill'
  | 'newDiscovery' | 'milestoneUnlock' | 'eventComplete'
  | 'mutationChoice' | 'essenceAbsorb' | 'mutationAcquire'
  | 'bossKill' | 'evolutionReveal';

export interface GameAudio {
  unlock(): void;
  pause(): void;
  resume(): void;
  play(cue: SoundCue): void;
}

interface Tone { start: number; end: number; duration: number; type: OscillatorType; gain: number; delay?: number }

const CUES: Record<SoundCue, readonly Tone[]> = {
  normalAttack: [{ start: 420, end: 620, duration: 0.045, type: 'sine', gain: 0.025 }],
  powerHit: [{ start: 155, end: 62, duration: 0.18, type: 'sawtooth', gain: 0.052 }, { start: 520, end: 170, duration: 0.11, type: 'triangle', gain: 0.025 }],
  bossImpact: [{ start: 92, end: 46, duration: 0.075, type: 'square', gain: 0.028 }],
  pumpkinShot: [{ start: 245, end: 510, duration: 0.07, type: 'triangle', gain: 0.032 }, { start: 740, end: 420, duration: 0.05, type: 'sine', gain: 0.016, delay: 0.025 }],
  pumpkinImpact: [{ start: 138, end: 54, duration: 0.12, type: 'triangle', gain: 0.042 }, { start: 620, end: 210, duration: 0.08, type: 'square', gain: 0.016 }],
  bossBreak: [{ start: 180, end: 72, duration: 0.28, type: 'sawtooth', gain: 0.058 }, { start: 390, end: 820, duration: 0.3, type: 'triangle', gain: 0.04, delay: 0.045 }],
  eventBossBreak: [{ start: 164, end: 48, duration: 0.31, type: 'sawtooth', gain: 0.054 }, { start: 310, end: 970, duration: 0.36, type: 'triangle', gain: 0.036, delay: 0.05 }, { start: 780, end: 460, duration: 0.16, type: 'sine', gain: 0.018, delay: 0.1 }],
  mutationChoice: [{ start: 560, end: 720, duration: 0.07, type: 'sine', gain: 0.032 }],
  essenceAbsorb: [{ start: 330, end: 920, duration: 0.25, type: 'sine', gain: 0.044 }],
  mutationAcquire: [{ start: 420, end: 1050, duration: 0.4, type: 'triangle', gain: 0.05 }, { start: 620, end: 1240, duration: 0.3, type: 'sine', gain: 0.025, delay: 0.12 }],
  bossKill: [{ start: 125, end: 34, duration: 0.5, type: 'sawtooth', gain: 0.06 }, { start: 280, end: 1080, duration: 0.55, type: 'triangle', gain: 0.04, delay: 0.07 }],
  eventBossKill: [{ start: 112, end: 28, duration: 0.58, type: 'sawtooth', gain: 0.06 }, { start: 235, end: 1120, duration: 0.62, type: 'triangle', gain: 0.038, delay: 0.06 }, { start: 820, end: 180, duration: 0.42, type: 'sine', gain: 0.022, delay: 0.14 }],
  evolutionReveal: [{ start: 260, end: 780, duration: 0.6, type: 'sine', gain: 0.042 }, { start: 390, end: 1170, duration: 0.65, type: 'triangle', gain: 0.026, delay: 0.08 }],
  newDiscovery: [{ start: 420, end: 960, duration: 0.32, type: 'triangle', gain: 0.042 }, { start: 650, end: 1300, duration: 0.38, type: 'sine', gain: 0.023, delay: 0.09 }],
  milestoneUnlock: [{ start: 330, end: 760, duration: 0.22, type: 'triangle', gain: 0.034 }, { start: 495, end: 990, duration: 0.25, type: 'sine', gain: 0.022, delay: 0.08 }],
  eventComplete: [{ start: 220, end: 880, duration: 0.62, type: 'triangle', gain: 0.045 }, { start: 330, end: 1320, duration: 0.72, type: 'sine', gain: 0.026, delay: 0.1 }],
};

export class ProceduralAudioBus implements GameAudio {
  private context?: AudioContext;
  private enabled = true;

  unlock(): void {
    if (!this.enabled) return;
    try {
      this.context ??= new AudioContext();
      void this.context.resume();
    } catch {
      this.enabled = false;
    }
  }

  pause(): void {
    if (this.context?.state === 'running') void this.context.suspend().catch(() => undefined);
  }

  resume(): void {
    if (this.context?.state === 'suspended') void this.context.resume().catch(() => undefined);
  }

  play(cue: SoundCue): void {
    const context = this.context;
    if (!context || context.state !== 'running' || !this.enabled) return;
    for (const tone of CUES[cue]) this.playTone(context, tone);
  }

  private playTone(context: AudioContext, tone: Tone): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startAt = context.currentTime + (tone.delay ?? 0);
    oscillator.type = tone.type;
    oscillator.frequency.setValueAtTime(tone.start, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, tone.end), startAt + tone.duration);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(tone.gain, startAt + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + tone.duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + tone.duration + 0.03);
  }
}
