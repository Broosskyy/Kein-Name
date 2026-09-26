import { RunRandom } from '../core/RunRandom';
import type { Vec2 } from './ArenaTypes';
export type LootKind='run-xp'|'crystal-essence'|'void-essence'|'wing-essence'|'pumpkin-essence'|'combat-orb'|'relic'|'harvest-energy';
export type LootRarity='common'|'rare'|'epic'; export type LootPhase='airborne'|'bouncing'|'grounded'|'magnetizing'|'collected';
export interface LootDrop{id:string;kind:LootKind;rarity:LootRarity;phase:LootPhase;position:Vec2;start:Vec2;target:Vec2;ageMs:number;flightMs:number;value:number;bounce:number}
export interface LootPickup{id:string;kind:LootKind;rarity:LootRarity;value:number;collector:'player'|'pet'}
export class LootSystem{
 readonly drops:LootDrop[]=[];private random:RunRandom;private sequence=0;
 constructor(seed:number,private readonly maxDrops=28){this.random=new RunRandom(seed^0x1007f00d)}
 reset(seed:number):void{this.drops.length=0;this.random=new RunRandom(seed^0x1007f00d);this.sequence=0}
	 spawn(kind:LootKind,rarity:LootRarity,start:Vec2,value=1,target?:Vec2):LootDrop|undefined{if(this.drops.filter(d=>d.phase!=='collected').length>=this.maxDrops)return;const destination=target??this.dropDestination(rarity);const d:LootDrop={id:`loot-${++this.sequence}`,kind,rarity,phase:'airborne',position:{...start},start:{...start},target:destination,ageMs:0,flightMs:520+this.random.next()*360,value,bounce:0};this.drops.push(d);return d}
	 update(deltaMs:number,player:Vec2,pickupRadius:number,pet?:Vec2):LootPickup[]{const result:LootPickup[]=[];for(const d of this.drops){if(d.phase==='collected')continue;d.ageMs+=deltaMs;if(d.phase==='airborne'){const t=Math.min(1,d.ageMs/d.flightMs);d.position.x=d.start.x+(d.target.x-d.start.x)*t;d.position.y=d.start.y+(d.target.y-d.start.y)*t-Math.sin(t*Math.PI)*260;if(t>=1){const over=d.ageMs-d.flightMs;d.phase=over>=100?'grounded':'bouncing';d.ageMs=Math.max(0,over);d.position={...d.target}}if(d.phase==='airborne')continue}if(d.phase==='bouncing'){d.bounce=Math.sin(Math.min(1,d.ageMs/100)*Math.PI)*34;d.position.y=d.target.y-d.bounce;if(d.ageMs>=100){d.phase='grounded';d.position={...d.target};d.ageMs=0}else continue}const playerDistance=Math.hypot(player.x-d.position.x,player.y-d.position.y),petDistance=pet?Math.hypot(pet.x-d.position.x,pet.y-d.position.y):Infinity;const petEligible=d.rarity==='common'&&playerDistance>pickupRadius&&petDistance<=pickupRadius*1.35;const collector=petEligible?'pet':'player';const target=petEligible?pet!:player;const distance=petEligible?petDistance:playerDistance;if(distance<=pickupRadius*1.7)d.phase='magnetizing';if(d.phase==='magnetizing'){const f=1-Math.exp(-deltaMs/95);d.position.x+=(target.x-d.position.x)*f;d.position.y+=(target.y-d.position.y)*f;if(distance<=28){d.phase='collected';result.push({id:d.id,kind:d.kind,rarity:d.rarity,value:d.value,collector})}}}
 if(this.drops.length>this.maxDrops*1.5){const firstLive=this.drops.findIndex(d=>d.phase!=='collected');if(firstLive>0)this.drops.splice(0,firstLive)}return result}
 private dropDestination(rarity:LootRarity):Vec2{
  if(rarity==='epic'){const a=this.random.next()*Math.PI*2,r=650+this.random.next()*280;return{x:2800+Math.cos(a)*r,y:1900+Math.sin(a)*r}}
  if(rarity==='rare'){const a=this.random.next()*Math.PI*2,r=900+this.random.next()*620;return{x:2800+Math.cos(a)*r,y:1900+Math.sin(a)*r}}
  return{x:360+this.random.next()*4880,y:360+this.random.next()*3280}
 }
}
