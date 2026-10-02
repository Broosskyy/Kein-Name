import { evo1HeroDirectionAsset, type HeroDirection, type HeroPose } from '../gameplay/HeroDirection';
import type { AssetKey } from '../assets';

export interface HeroAnimationFrame {
  asset: AssetKey;
  durationMs: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

export interface HeroAnimationClip {
  state: HeroPose;
  direction: HeroDirection;
  frames: readonly HeroAnimationFrame[];
  fps: number;
  loop: boolean;
  footAnchor: number;
  scale: number;
  pivot: Readonly<{ x: number; y: number }>;
}

const DIRECTIONS: readonly HeroDirection[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
const POSES: readonly HeroPose[] = ['idle', 'run', 'dash', 'attack'];
const FRAME_COUNTS: Readonly<Record<HeroPose, number>> = { idle: 4, run: 8, dash: 4, attack: 6 };
const FPS: Readonly<Record<HeroPose, number>> = { idle: 4, run: 12, dash: 15, attack: 11 };

/** M10.4 clip manifest. The current 32 authored directional cutouts are reused
 * as stable key poses; timed frame entries provide a real animation pipeline
 * now and can be replaced one-for-one by production frame art later. */
export const HERO_ANIMATION_CLIPS: Readonly<Record<string, HeroAnimationClip>> = Object.freeze(Object.fromEntries(
  DIRECTIONS.flatMap((direction) => POSES.map((state) => {
    const count = FRAME_COUNTS[state];
    const frameMs = 1000 / FPS[state];
    const frames = Array.from({ length: count }, (_, index): HeroAnimationFrame => {
      const phase = index / count * Math.PI * 2;
      const run = state === 'run', dash = state === 'dash', attack = state === 'attack';
      return {
        asset: evo1HeroDirectionAsset(direction, state),
        durationMs: frameMs,
        offsetX: attack ? Math.sin(phase) * .018 : 0,
        offsetY: run ? Math.abs(Math.sin(phase)) * .055 : state === 'idle' ? Math.sin(phase) * .012 : dash ? Math.sin(phase) * .025 : Math.sin(phase) * .02,
        scaleX: dash ? 1.08 + Math.sin(phase) * .035 : attack ? 1 + Math.sin(phase) * .022 : 1,
        scaleY: dash ? .93 - Math.sin(phase) * .025 : run ? 1 - Math.abs(Math.sin(phase)) * .018 : 1,
        rotation: run ? Math.sin(phase) * .018 : attack ? Math.sin(phase) * .025 : 0,
      };
    });
    const clip: HeroAnimationClip = { state, direction, frames, fps: FPS[state], loop: state === 'idle' || state === 'run', footAnchor: .0521, scale: 2.05, pivot: { x: .5, y: .0521 } };
    return [`${state}.${direction}`, clip];
  })),
));

export class HeroAnimationController {
  currentState: HeroPose = 'idle';
  currentDirection: HeroDirection = 'n';
  frameIndex = 0;
  elapsed = 0;
  lockedDirection?: HeroDirection;

  update(deltaMs: number, state: HeroPose, direction: HeroDirection): HeroAnimationFrame {
    const stateChanged = state !== this.currentState;
    const directionChanged = direction !== this.currentDirection;
    if (stateChanged) {
      this.currentState = state;
      this.currentDirection = direction;
      this.frameIndex = 0;
      this.elapsed = 0;
    } else if (directionChanged) {
      // Preserve phase across a turn so a running creature does not restart its
      // gait every time it crosses an octant boundary.
      const previous = this.clip();
      const normalized = (this.frameIndex + this.elapsed / Math.max(1, previous.frames[this.frameIndex].durationMs)) / previous.frames.length;
      this.currentDirection = direction;
      const next = this.clip();
      const phase = normalized * next.frames.length;
      this.frameIndex = Math.min(next.frames.length - 1, Math.floor(phase));
      this.elapsed = (phase - this.frameIndex) * next.frames[this.frameIndex].durationMs;
    }

    const clip = this.clip();
    this.elapsed += Math.max(0, deltaMs);
    while (this.elapsed >= clip.frames[this.frameIndex].durationMs) {
      this.elapsed -= clip.frames[this.frameIndex].durationMs;
      if (this.frameIndex < clip.frames.length - 1) this.frameIndex += 1;
      else if (clip.loop) this.frameIndex = 0;
      else { this.frameIndex = clip.frames.length - 1; this.elapsed = 0; break; }
    }
    return clip.frames[this.frameIndex];
  }

  clip(): HeroAnimationClip { return HERO_ANIMATION_CLIPS[`${this.currentState}.${this.currentDirection}`]; }
  frame(): HeroAnimationFrame { return this.clip().frames[this.frameIndex]; }
}

export function heroAnimationClip(state: HeroPose, direction: HeroDirection): HeroAnimationClip {
  return HERO_ANIMATION_CLIPS[`${state}.${direction}`];
}
