import { describe, expect, it } from 'vitest';
import { CombatModel } from '../core/CombatModel';
import { ArenaCamera } from './ArenaCamera';
import { ARENA_BOUNDS } from './ArenaTypes';
import { ArenaRunModel } from './ArenaRunModel';
import { BossAttackSystem } from './BossAttackSystem';
import { LootSystem } from './LootSystem';

function create(seed=77){const combat=new CombatModel(0,{seedGenerator:()=>seed,idGenerator:()=>`run-${seed}`});return {combat,arena:new ArenaRunModel(combat,'guest')}}

describe('M07 world, camera and active combat',()=>{
 it('moves freely on both axes and normalizes diagonals',()=>{const {arena}=create();const start={...arena.player.position};arena.movePlayer(1000,{x:1,y:1});expect(arena.player.position.x).toBeGreaterThan(start.x);expect(arena.player.position.y).toBeGreaterThan(start.y);expect(Math.hypot(arena.player.velocity.x,arena.player.velocity.y)).toBeLessThanOrEqual(arena.player.stats.moveSpeed+.01)});
 it('clamps movement to expanded arena bounds',()=>{const {arena}=create();for(let i=0;i<30;i++)arena.movePlayer(1000,{x:1,y:1});expect(arena.player.position.x).toBe(ARENA_BOUNDS.maxX);expect(arena.player.position.y).toBe(ARENA_BOUNDS.maxY)});
 it('camera follows, clamps zoom and round-trips transforms',()=>{const c=new ArenaCamera(3200,1800,.78,1.22);c.resize(390,844);c.setZoom(9);expect(c.targetZoom).toBe(1.22);c.setZoom(.1);expect(c.targetZoom).toBe(.78);c.setZoom(.92);c.update(1000,{x:2200,y:1300},{x:500,y:0});expect(c.position.x).toBeGreaterThan(1600);const p={x:1800,y:1200},s=c.worldToScreen(p),back=c.screenToWorld(s);expect(back.x).toBeCloseTo(p.x);expect(back.y).toBeCloseTo(p.y)});
 it('zoom changes presentation but not gameplay stats',()=>{const {arena}=create();const speed=arena.player.stats.moveSpeed;const c=new ArenaCamera(3200,1800,.78,1.22);c.resize(390,844);c.setZoom(1.22);c.update(100,{x:1600,y:1200},{x:0,y:0});expect(arena.player.stats.moveSpeed).toBe(speed)});
 it('dash uses direction, cooldown and invulnerability',()=>{const {arena}=create();const x=arena.player.position.x;expect(arena.dash({x:1,y:0})).toBe(true);expect(arena.player.position.x).toBeGreaterThan(x);expect(arena.player.invulnerableMs).toBeGreaterThan(0);expect(arena.dash({x:1,y:0})).toBe(false);arena.update(2500,{x:0,y:0},2500);expect(arena.dash({x:0,y:-1})).toBe(true)});
 it('unlocks richer attacks by phase and cycle',()=>{const s=new BossAttackSystem(1);expect(s.availableKinds(1,1)).not.toContain('void-cone');expect(s.availableKinds(1,.6)).toContain('void-cone');expect(s.availableKinds(3,.2)).toContain('corruption-ring')});
 it('keeps telegraph lifecycle deterministic and one-impact',()=>{const s=new BossAttackSystem(3);s.force('corruption-ring',{x:1600,y:1000});expect(s.update(1400,{x:1600,y:1400},3,true,.2)).toHaveLength(1);expect(s.update(1,{x:1600,y:1400},3,true,.2)).toHaveLength(0)});
 it('spawns loot across world space and pet only collects common loot',()=>{const l=new LootSystem(9);const common=l.spawn('run-xp','common',{x:1600,y:200},1,{x:1000,y:1000})!;const epic=l.spawn('relic','epic',{x:1600,y:200},1,{x:1000,y:1000})!;const picked=[...l.update(1400,{x:2000,y:1500},100,{x:1000,y:1000}),...l.update(50,{x:2000,y:1500},100,{x:1000,y:1000})];expect(picked.some(p=>p.id===common.id&&p.collector==='pet')).toBe(true);expect(epic.phase).not.toBe('collected')});
 it('creates separated 1/2/4/8 player visual layouts without online claims',()=>{const {arena}=create();arena.setVisualPlayerCount(8);expect(arena.dummyAllies).toHaveLength(7);expect(new Set(arena.dummyAllies.map(d=>`${d.position.x},${d.position.y}`)).size).toBe(7);expect(arena.dummyAllies.every(d=>d.isOnlinePlayer===false)).toBe(true);arena.setVisualPlayerCount(1);expect(arena.dummyAllies).toHaveLength(0)});
 it('serializes dash, pet and restores older snapshots safely',()=>{const {arena}=create();arena.dash({x:1,y:0});const snapshot=arena.snapshot(10);expect(snapshot.schemaVersion).toBe(2);expect(()=>JSON.stringify(snapshot)).not.toThrow();const {arena:restored}=create();restored.restore({...snapshot,schemaVersion:1,dashCooldownMs:undefined,petPosition:undefined},20);expect(restored.player.position).toEqual(snapshot.player.position)});
});
