import type { HeroDirection, HeroPose } from '../gameplay/HeroDirection';

/** Alpha-derived distance from texture bottom to the lowest visible foot pixel.
 * Keeping the Sprite center on this baseline prevents authored frames with
 * different transparent padding from sinking or floating during swaps. */
export const HERO_FOOT_ANCHOR: Readonly<Record<HeroDirection, Readonly<Record<HeroPose, number>>>> = {
  n:  { idle: .1042, run: .1042, dash: .1042, attack: .1042 },
  ne: { idle: .1042, run: .1042, dash: .1042, attack: .1042 },
  e:  { idle: .1042, run: .1042, dash: .1042, attack: .1042 },
  se: { idle: .1042, run: .1042, dash: .1042, attack: .1042 },
  s:  { idle: .1042, run: .1042, dash: .1042, attack: .1042 },
  sw: { idle: .1042, run: .1042, dash: .1042, attack: .1042 },
  w:  { idle: .1042, run: .1042, dash: .1042, attack: .1042 },
  nw: { idle: .1042, run: .1042, dash: .1042, attack: .1042 },
};

export function heroFootAnchor(direction: HeroDirection, pose: HeroPose): number {
  return HERO_FOOT_ANCHOR[direction][pose];
}
