import { RunRandom } from '../core/RunRandom';
import { ARENA_BOUNDS, type Vec2 } from './ArenaTypes';
import { BOSS_WORLD_ANCHOR } from './ArenaRegions';
import type { BossDistanceZone, BossSector } from './BossWorldEntity';

export type BossAttackKind='ground-slam'|'core-beam'|'falling-debris'|'void-cone'|'corruption-ring'|'shockwave'|'moving-hazard'|'arm-sweep'|'rear-slam'|'radial-shockwave';
export type TelegraphPhase='telegraph'|'impact'|'recovery'|'done';
export type TelegraphShape='circle'|'line'|'cone'|'ring';
export interface BossAttackDefinition{kind:BossAttackKind;shape:TelegraphShape;telegraphMs:number;impactMs:number;recoveryMs:number;baseDamage:number;radius:number;innerRadius?:number}
export interface BossTelegraph{id:string;kind:BossAttackKind;phase:TelegraphPhase;position:Vec2;origin:Vec2;direction:Vec2;radius:number;innerRadius:number;elapsedMs:number;damage:number;hitApplied:boolean}
export interface BossSpatialContext{position:Vec2;orientation:number;sector:BossSector;distanceZone:BossDistanceZone;velocity?:Vec2}
export const BOSS_ATTACKS:Readonly<Record<BossAttackKind,BossAttackDefinition>>={
 'ground-slam':{kind:'ground-slam',shape:'circle',telegraphMs:1000,impactMs:180,recoveryMs:650,baseDamage:26,radius:270},
 'core-beam':{kind:'core-beam',shape:'line',telegraphMs:930,impactMs:380,recoveryMs:560,baseDamage:20,radius:105},
 'falling-debris':{kind:'falling-debris',shape:'circle',telegraphMs:1180,impactMs:170,recoveryMs:430,baseDamage:18,radius:150},
 'void-cone':{kind:'void-cone',shape:'cone',telegraphMs:1080,impactMs:260,recoveryMs:660,baseDamage:24,radius:1050},
 'corruption-ring':{kind:'corruption-ring',shape:'ring',telegraphMs:1280,impactMs:230,recoveryMs:720,baseDamage:28,radius:680,innerRadius:330},
 shockwave:{kind:'shockwave',shape:'ring',telegraphMs:920,impactMs:280,recoveryMs:700,baseDamage:25,radius:620,innerRadius:430},
 'moving-hazard':{kind:'moving-hazard',shape:'circle',telegraphMs:900,impactMs:650,recoveryMs:480,baseDamage:18,radius:180},
 'arm-sweep':{kind:'arm-sweep',shape:'cone',telegraphMs:850,impactMs:280,recoveryMs:720,baseDamage:25,radius:900},
 'rear-slam':{kind:'rear-slam',shape:'circle',telegraphMs:760,impactMs:200,recoveryMs:640,baseDamage:27,radius:360},
 'radial-shockwave':{kind:'radial-shockwave',shape:'ring',telegraphMs:1180,impactMs:300,recoveryMs:820,baseDamage:30,radius:980,innerRadius:700},
};
export interface BossAttackImpact{id:string;kind:BossAttackKind;damage:number;hit:boolean;position:Vec2;radius:number}

export class BossAttackSystem{
 readonly active:BossTelegraph[]=[];private random:RunRandom;private cooldownMs=2600;private sequence=0;private recent:BossAttackKind[]=[];
 constructor(seed:number){this.random=new RunRandom(seed^0xb055a77a)}
 reset(seed:number):void{this.active.length=0;this.random=new RunRandom(seed^0xb055a77a);this.cooldownMs=2200;this.sequence=0;this.recent=[]}
 availableKinds(cycle:number,hpRatio:number,distance=1200,sector:BossSector='front'):BossAttackKind[]{
  const phase=hpRatio>.7?1:hpRatio>.4?2:3;
  const kinds:BossAttackKind[]=phase===1?['ground-slam','falling-debris']:phase===2?['ground-slam','core-beam','void-cone','falling-debris']:['core-beam','void-cone','corruption-ring','shockwave','moving-hazard'];
  if(sector==='rear')kinds.push('rear-slam');
  if(sector==='left-flank'||sector==='right-flank')kinds.push('arm-sweep');
  if(distance<850&&!kinds.includes('shockwave'))kinds.push('shockwave');
  if(distance>1350&&!kinds.includes('core-beam'))kinds.push('core-beam');
  if(cycle>=2&&!kinds.includes('arm-sweep'))kinds.push('arm-sweep');
  if(cycle>=3)kinds.push('radial-shockwave');
  return [...new Set(kinds)];
 }
 force(kind:BossAttackKind,target:Vec2,cycle=1,context?:Partial<BossSpatialContext>):BossTelegraph{
  const definition=BOSS_ATTACKS[kind],origin={...(context?.position??BOSS_WORLD_ANCHOR)};
  let position={...target};
  if(kind==='radial-shockwave'||kind==='corruption-ring'||kind==='shockwave')position={...origin};
  if(kind==='rear-slam'){const orientation=context?.orientation??Math.PI/2;position={x:origin.x-Math.cos(orientation)*560,y:origin.y-Math.sin(orientation)*560}}
  const length=Math.max(1,Math.hypot(target.x-origin.x,target.y-origin.y));
  const attack:BossTelegraph={id:`boss-attack-${++this.sequence}`,kind,phase:'telegraph',position,origin,direction:{x:(target.x-origin.x)/length,y:(target.y-origin.y)/length},radius:definition.radius,innerRadius:definition.innerRadius??0,elapsedMs:0,damage:Math.round(definition.baseDamage*(1+(cycle-1)*.22)),hitApplied:false};this.active.push(attack);return attack;
 }
 update(deltaMs:number,player:Vec2,cycle:number,enabled=true,hpRatio=1,context?:BossSpatialContext):BossAttackImpact[]{
  const impacts:BossAttackImpact[]=[];if(!enabled)return impacts;this.cooldownMs-=deltaMs;
  const boss=context?.position??BOSS_WORLD_ANCHOR,distance=Math.hypot(player.x-boss.x,player.y-boss.y),sector=context?.sector??'front';
  if(this.cooldownMs<=0&&this.active.length<(cycle>=3?2:1)){
   const available=this.availableKinds(cycle,hpRatio,distance,sector);let pool=available.filter(kind=>!this.recent.slice(-2).includes(kind));if(!pool.length)pool=available;
   const kind=pool[Math.floor(this.random.next()*pool.length)],lead=context?.velocity??{x:0,y:0},jitter=()=>(this.random.next()-.5)*760;
   const target={x:clamp(player.x+lead.x*.22+jitter(),ARENA_BOUNDS.minX+100,ARENA_BOUNDS.maxX-100),y:clamp(player.y+lead.y*.22+jitter()*.65,ARENA_BOUNDS.minY+100,ARENA_BOUNDS.maxY-100)};
   this.force(kind,target,cycle,context);this.recent.push(kind);if(this.recent.length>5)this.recent.shift();
   const pressure=this.active.length>1?1.35:1;this.cooldownMs=Math.max(1250,(3300-cycle*230)*(.9+this.random.next()*.26)*pressure);
  }
  for(const attack of this.active){attack.elapsedMs+=deltaMs;const definition=BOSS_ATTACKS[attack.kind];if(attack.kind==='moving-hazard'&&attack.phase!=='done'){attack.position.x+=attack.direction.x*deltaMs*.2;attack.position.y+=attack.direction.y*deltaMs*.2}if(attack.phase==='telegraph'&&attack.elapsedMs>=definition.telegraphMs){attack.phase='impact';attack.elapsedMs=0;impacts.push({id:attack.id,kind:attack.kind,damage:attack.damage,hit:this.hits(attack,player),position:{...attack.position},radius:attack.radius});attack.hitApplied=true}else if(attack.phase==='impact'&&attack.elapsedMs>=definition.impactMs){attack.phase='recovery';attack.elapsedMs=0}else if(attack.phase==='recovery'&&attack.elapsedMs>=definition.recoveryMs)attack.phase='done'}
  for(let index=this.active.length-1;index>=0;index--)if(this.active[index].phase==='done')this.active.splice(index,1);return impacts;
 }
 private hits(attack:BossTelegraph,player:Vec2):boolean{const definition=BOSS_ATTACKS[attack.kind],dx=player.x-attack.position.x,dy=player.y-attack.position.y,distance=Math.hypot(dx,dy);if(definition.shape==='circle')return distance<=attack.radius;if(definition.shape==='ring')return distance<=attack.radius&&distance>=attack.innerRadius;const ox=player.x-attack.origin.x,oy=player.y-attack.origin.y,along=ox*attack.direction.x+oy*attack.direction.y,side=Math.abs(ox*attack.direction.y-oy*attack.direction.x);if(definition.shape==='line')return along>=0&&along<=2400&&side<=attack.radius;return along>=0&&along<=attack.radius&&side<=along*.58}
}
function clamp(value:number,min:number,max:number):number{return Math.max(min,Math.min(max,value))}
