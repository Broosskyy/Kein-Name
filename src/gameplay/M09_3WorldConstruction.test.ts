import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';
import { ASSET_MANIFEST } from '../assets';
import { MUTATION_VISUAL_SCALE } from '../render/GameScene';
import { ArenaCamera } from './ArenaCamera';
import { HARVEST_ARENA_MAP } from './HarvestArenaMap';
import { auditMapCoverage } from './MapDefinition';

const inside=(point:{x:number;y:number})=>point.x>=0&&point.x<=HARVEST_ARENA_MAP.width&&point.y>=0&&point.y<=HARVEST_ARENA_MAP.height;
const colliderContains=(point:{x:number;y:number})=>HARVEST_ARENA_MAP.colliders.some((collider)=>{
  const dx=point.x-collider.center.x,dy=point.y-collider.center.y;
  if(collider.shape==='circle')return Math.hypot(dx,dy)<(collider.radius??0);
  if(collider.shape==='aabb')return Math.abs(dx)<(collider.halfWidth??0)&&Math.abs(dy)<(collider.halfHeight??0);
  return dx*dx/Math.max(1,(collider.radiusX??1)**2)+dy*dy/Math.max(1,(collider.radiusY??1)**2)<1;
});

describe('M09.3 Harvest Arena world construction',()=>{
  it('keeps every region, spawn and authored world object inside map bounds',()=>{
    expect(inside(HARVEST_ARENA_MAP.playerSpawn)).toBe(true);expect(inside(HARVEST_ARENA_MAP.bossSpawn)).toBe(true);
    for(const zone of HARVEST_ARENA_MAP.zones)expect(inside(zone.center),zone.id).toBe(true);
    for(const item of [...HARVEST_ARENA_MAP.terrainPatches,...HARVEST_ARENA_MAP.structures,...HARVEST_ARENA_MAP.props,...HARVEST_ARENA_MAP.groundDetails])expect(inside(item),item.id).toBe(true);
  });

  it('uses unique region, landmark, patch and corridor ids',()=>{
    const groups=[HARVEST_ARENA_MAP.zones,HARVEST_ARENA_MAP.terrainPatches,HARVEST_ARENA_MAP.structures,HARVEST_ARENA_MAP.props,HARVEST_ARENA_MAP.groundDetails,HARVEST_ARENA_MAP.traversalCorridors];
    for(const group of groups)expect(new Set(group.map((item)=>item.id)).size).toBe(group.length);
  });

  it('provides authored macro terrain coverage for every 800-unit audit cell',()=>{
    const cells=auditMapCoverage(HARVEST_ARENA_MAP,800);
    expect(cells.length).toBeGreaterThan(30);expect(cells.filter((cell)=>!cell.covered)).toEqual([]);
  });

  it('keeps the centerline of every important traversal corridor open',()=>{
    for(const corridor of HARVEST_ARENA_MAP.traversalCorridors)for(let step=0;step<=10;step+=1){
      const t=step/10,point={x:corridor.from.x+(corridor.to.x-corridor.from.x)*t,y:corridor.from.y+(corridor.to.y-corridor.from.y)*t};
      expect(colliderContains(point),`${corridor.id}@${step}`).toBe(false);
    }
  });

  it('registers valid runtime assets for every terrain, structure and retained Hero frame',()=>{
    const keys=new Set([...HARVEST_ARENA_MAP.terrainPatches,...HARVEST_ARENA_MAP.structures,...HARVEST_ARENA_MAP.props,...HARVEST_ARENA_MAP.groundDetails].map((item)=>item.key));
    for(const key of keys){const src=ASSET_MANIFEST[key].src;expect(src,key).toBeTruthy();expect(existsSync(resolve(process.cwd(),'public',src!.slice(1))),src).toBe(true)}
    for(const direction of ['n','ne','e','se','s','sw','w','nw'] as const)for(const pose of ['idle','run','dash','attack'] as const){const src=ASSET_MANIFEST[`creature.direction.${direction}.${pose}`].src!;expect(existsSync(resolve(process.cwd(),'public',src.slice(1)))).toBe(true)}
  });

  it.each([.62,1.38])('keeps camera viewport inside the world at zoom %s',(zoom)=>{
    const camera=new ArenaCamera(5600,4000,.62,1.38);camera.resize(390,844);camera.zoom=zoom;camera.targetZoom=zoom;
    for(const target of [{x:0,y:0},{x:5600,y:0},{x:0,y:4000},{x:5600,y:4000}]){
      camera.position={...target};camera.update(16,target,{x:0,y:0});
      const a=camera.screenToWorld({x:camera.viewport.x,y:camera.viewport.y});
      const b=camera.screenToWorld({x:camera.viewport.x+camera.viewport.width,y:camera.viewport.y+camera.viewport.height});
      expect(a.x).toBeGreaterThanOrEqual(-1);expect(a.y).toBeGreaterThanOrEqual(-1);expect(b.x).toBeLessThanOrEqual(5601);expect(b.y).toBeLessThanOrEqual(4001);
    }
  });

  it('keeps camera/LOD presentation independent from simulation and mutation overlays restrained',()=>{
    const player={x:2800,y:3420};const snapshot={...player};const camera=new ArenaCamera(5600,4000,.62,1.38);camera.resize(390,844);
    camera.panByScreen(320,-460);camera.setZoom(.62);camera.update(300,player,{x:0,y:0});
    expect(player).toEqual(snapshot);expect(Math.max(...Object.values(MUTATION_VISUAL_SCALE))).toBeLessThanOrEqual(.52);
  });
});
