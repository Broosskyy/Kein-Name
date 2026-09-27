import type { Vec2 } from './ArenaTypes';

export interface WorldPoint { x:number; depth:number; height:number }

/** Simulation uses planar world units. Renderers explicitly adapt them instead
 * of treating Pixi screen pixels as gameplay truth. */
export function planarToWorld(point:Vec2, height=0):WorldPoint{return{x:point.x,depth:point.y,height}}
export function worldToPlanar(point:WorldPoint):Vec2{return{x:point.x,y:point.depth}}

