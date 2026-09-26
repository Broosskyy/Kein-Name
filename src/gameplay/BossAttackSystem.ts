import { RunRandom } from '../core/RunRandom';
import type { Vec2 } from './ArenaTypes';
import { BOSS_WORLD_ANCHOR } from './ArenaRegions';

export type BossAttackKind = 'ground-slam'|'core-beam'|'falling-debris'|'void-cone'|'corruption-ring'|'shockwave'|'moving-hazard';
export type TelegraphPhase = 'telegraph'|'impact'|'recovery'|'done';
export type TelegraphShape = 'circle'|'line'|'cone'|'ring';
export interface BossAttackDefinition { kind:BossAttackKind; shape:TelegraphShape; telegraphMs:number; impactMs:number; recoveryMs:number; baseDamage:number; radius:number; innerRadius?:number }
export interface BossTelegraph { id:string;kind:BossAttackKind;phase:TelegraphPhase;position:Vec2;origin:Vec2;direction:Vec2;radius:number;innerRadius:number;elapsedMs:number;damage:number;hitApplied:boolean }
export const BOSS_ATTACKS:Readonly<Record<BossAttackKind,BossAttackDefinition>>={
 'ground-slam':{kind:'ground-slam',shape:'circle',telegraphMs:1050,impactMs:180,recoveryMs:620,baseDamage:26,radius:220},
 'core-beam':{kind:'core-beam',shape:'line',telegraphMs:900,impactMs:360,recoveryMs:520,baseDamage:20,radius:92},
 'falling-debris':{kind:'falling-debris',shape:'circle',telegraphMs:1250,impactMs:160,recoveryMs:400,baseDamage:18,radius:125},
 'void-cone':{kind:'void-cone',shape:'cone',telegraphMs:1120,impactMs:240,recoveryMs:620,baseDamage:24,radius:720},
 'corruption-ring':{kind:'corruption-ring',shape:'ring',telegraphMs:1300,impactMs:220,recoveryMs:700,baseDamage:28,radius:520,innerRadius:250},
 shockwave:{kind:'shockwave',shape:'ring',telegraphMs:980,impactMs:260,recoveryMs:680,baseDamage:25,radius:440,innerRadius:300},
 'moving-hazard':{kind:'moving-hazard',shape:'circle',telegraphMs:920,impactMs:620,recoveryMs:460,baseDamage:18,radius:145},
};
export interface BossAttackImpact{id:string;kind:BossAttackKind;damage:number;hit:boolean;position:Vec2;radius:number}
export class BossAttackSystem{
 readonly active:BossTelegraph[]=[];private random:RunRandom;private cooldownMs=2600;private sequence=0;private recent:BossAttackKind[]=[];
 constructor(seed:number){this.random=new RunRandom(seed^0xb055a77a)}
 reset(seed:number):void{this.active.length=0;this.random=new RunRandom(seed^0xb055a77a);this.cooldownMs=2200;this.sequence=0;this.recent=[]}
 availableKinds(cycle:number,hpRatio:number,distance=900):BossAttackKind[]{const phase=hpRatio>.7?1:hpRatio>.4?2:3;const kinds:BossAttackKind[]=phase===1?['ground-slam','falling-debris']:phase===2?['ground-slam','core-beam','void-cone','falling-debris']:['core-beam','void-cone','corruption-ring','shockwave','moving-hazard'];if(distance<620&&!kinds.includes('shockwave'))kinds.push('shockwave');if(distance>1250&&!kinds.includes('core-beam'))kinds.push('core-beam');if(cycle>=2&&!kinds.includes('core-beam'))kinds.push('core-beam');if(cycle>=3&&!kinds.includes('corruption-ring'))kinds.push('corruption-ring');return kinds}
 force(kind:BossAttackKind,target:Vec2,cycle=1):BossTelegraph{const d=BOSS_ATTACKS[kind],origin={...BOSS_WORLD_ANCHOR},length=Math.max(1,Math.hypot(target.x-origin.x,target.y-origin.y));const a:BossTelegraph={id:`boss-attack-${++this.sequence}`,kind,phase:'telegraph',position:{...target},origin,direction:{x:(target.x-origin.x)/length,y:(target.y-origin.y)/length},radius:d.radius,innerRadius:d.innerRadius??0,elapsedMs:0,damage:Math.round(d.baseDamage*(1+(cycle-1)*.22)),hitApplied:false};this.active.push(a);return a}
 update(deltaMs:number,player:Vec2,cycle:number,enabled=true,hpRatio=1):BossAttackImpact[]{const impacts:BossAttackImpact[]=[];if(!enabled)return impacts;this.cooldownMs-=deltaMs;if(this.cooldownMs<=0&&this.active.length<3){const distance=Math.hypot(player.x-BOSS_WORLD_ANCHOR.x,player.y-BOSS_WORLD_ANCHOR.y);let pool=this.availableKinds(cycle,hpRatio,distance).filter(k=>!this.recent.slice(-2).includes(k));if(!pool.length)pool=this.availableKinds(cycle,hpRatio,distance);const kind=pool[Math.floor(this.random.next()*pool.length)],jitter=()=>(this.random.next()-.5)*620,target={x:clamp(player.x+jitter(),260,2940),y:clamp(player.y+jitter()*.6,260,1540)};this.force(kind,target,cycle);this.recent.push(kind);if(this.recent.length>4)this.recent.shift();this.cooldownMs=Math.max(1120,(3250-cycle*220)*(.9+this.random.next()*.28))}
 for(const a of this.active){a.elapsedMs+=deltaMs;const d=BOSS_ATTACKS[a.kind];if(a.kind==='moving-hazard'&&a.phase!=='done'){a.position.x+=a.direction.x*deltaMs*.16;a.position.y+=a.direction.y*deltaMs*.16}if(a.phase==='telegraph'&&a.elapsedMs>=d.telegraphMs){a.phase='impact';a.elapsedMs=0;impacts.push({id:a.id,kind:a.kind,damage:a.damage,hit:this.hits(a,player),position:{...a.position},radius:a.radius});a.hitApplied=true}else if(a.phase==='impact'&&a.elapsedMs>=d.impactMs){a.phase='recovery';a.elapsedMs=0}else if(a.phase==='recovery'&&a.elapsedMs>=d.recoveryMs)a.phase='done'}for(let i=this.active.length-1;i>=0;i--)if(this.active[i].phase==='done')this.active.splice(i,1);return impacts}
 private hits(a:BossTelegraph,p:Vec2):boolean{const d=BOSS_ATTACKS[a.kind],dx=p.x-a.position.x,dy=p.y-a.position.y,dist=Math.hypot(dx,dy);if(d.shape==='circle')return dist<=a.radius;if(d.shape==='ring')return dist<=a.radius&&dist>=a.innerRadius;const ox=p.x-a.origin.x,oy=p.y-a.origin.y,along=ox*a.direction.x+oy*a.direction.y,side=Math.abs(ox*a.direction.y-oy*a.direction.x);if(d.shape==='line')return along>=0&&along<=1900&&side<=a.radius;return along>=0&&along<=a.radius&&side<=along*.58}
}
function clamp(v:number,min:number,max:number):number{return Math.max(min,Math.min(max,v))}
