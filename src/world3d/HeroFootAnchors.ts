import type { HeroDirection, HeroPose } from '../gameplay/HeroDirection';

/** Alpha-derived distance from texture bottom to the lowest visible foot pixel.
 * Keeping the Sprite center on this baseline prevents authored frames with
 * different transparent padding from sinking or floating during swaps. */
export const HERO_FOOT_ANCHOR: Readonly<Record<HeroDirection, Readonly<Record<HeroPose, number>>>> = {
  n:  { idle: .148, run: .148, dash: .117, attack: .161 },
  ne: { idle: .161, run: .143, dash: .151, attack: .120 },
  e:  { idle: .151, run: .177, dash: .125, attack: .115 },
  se: { idle: .156, run: .151, dash: .094, attack: .094 },
  s:  { idle: .094, run: .091, dash: .180, attack: .112 },
  sw: { idle: .091, run: .091, dash: .138, attack: .091 },
  w:  { idle: .161, run: .206, dash: .211, attack: .250 },
  nw: { idle: .198, run: .159, dash: .253, attack: .148 },
};

export function heroFootAnchor(direction: HeroDirection, pose: HeroPose): number {
  return HERO_FOOT_ANCHOR[direction][pose];
}
