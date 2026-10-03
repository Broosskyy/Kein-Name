import { describe,expect,it } from 'vitest';
import { ASSET_MANIFEST } from '../assets';
import { MUTATION_VISUAL_SCALE } from '../render/GameScene';
import { ArenaCamera } from './ArenaCamera';
import { HARVEST_ARENA_MAP,HARVEST_TRAVERSAL_WAYPOINTS,MASTER_COMPOSITION_SCENARIO } from './HarvestArenaMap';
import { cameraRelativeHeroDirection, heroDirectionFromVector } from './HeroDirection';
import { mapZoneAt,worldToMinimap } from './MapDefinition';
import { WorldCollisionSystem } from './WorldCollisionSystem';
import { planarToWorld,worldToPlanar } from './WorldCoordinates';

describe('M09.2.1 real map, living hero and camera',()=>{
  it('round-trips renderer-independent world coordinates',()=>{const p={x:1234,y:3456};expect(worldToPlanar(planarToWorld(p,17))).toEqual(p)});
  it('loads one continuous authored Harvest map',()=>{
    expect(HARVEST_ARENA_MAP.width).toBe(5600);expect(HARVEST_ARENA_MAP.height).toBe(4000);
    expect(HARVEST_ARENA_MAP.zones).toHaveLength(8);expect(HARVEST_ARENA_MAP.props.length).toBeGreaterThan(20);
    expect(mapZoneAt(HARVEST_ARENA_MAP.playerSpawn,HARVEST_ARENA_MAP).id).toBe('lower-entry');
    expect(HARVEST_TRAVERSAL_WAYPOINTS.length).toBeGreaterThan(7);expect(MASTER_COMPOSITION_SCENARIO.dummies).toHaveLength(3);
  });
  it.each([
    [{x:0,y:-1},'n'],[{x:1,y:-1},'ne'],[{x:1,y:0},'e'],[{x:1,y:1},'se'],[{x:0,y:1},'s'],[{x:-1,y:1},'sw'],[{x:-1,y:0},'w'],[{x:-1,y:-1},'nw'],
  ] as const)('maps movement %j to %s view',(vector,direction)=>expect(heroDirectionFromVector(vector)).toBe(direction));
  it('retains last facing while stopped',()=>expect(heroDirectionFromVector({x:0,y:0},'nw')).toBe('nw'));
  it('changes only the rendered Hero view as the local camera orbits',()=>{
    expect(cameraRelativeHeroDirection('n',0)).toBe('n');
    expect(cameraRelativeHeroDirection('n',Math.PI/2)).toBe('e');
    expect(cameraRelativeHeroDirection('n',Math.PI)).toBe('s');
    expect(cameraRelativeHeroDirection('n',-Math.PI/2)).toBe('w');
    expect(cameraRelativeHeroDirection('se',Math.PI/2)).toBe('sw');
  });
  it('registers all directional production frames',()=>{
    for(const direction of ['n','ne','e','se','s','sw','w','nw'] as const)for(const pose of ['idle','run','dash','attack'] as const)expect(ASSET_MANIFEST[`creature.direction.${direction}.${pose}`].src).toMatch(/directional\/creature-/);
  });
  it('resolves major prop collision without creating a maze wall',()=>{
    const collider=HARVEST_ARENA_MAP.colliders[0];const result=new WorldCollisionSystem([collider]).resolve({...collider.center});
    expect(result).not.toEqual(collider.center);expect(HARVEST_ARENA_MAP.colliders.length).toBeLessThan(HARVEST_ARENA_MAP.props.length);
  });
  it('supports substantial independent XY and diagonal camera inspection',()=>{
    const camera=new ArenaCamera(5600,4000,.62,1.38);camera.resize(390,844);const player={x:2800,y:3000};camera.position={...player};
    camera.panByScreen(-250,260);for(let i=0;i<20;i++)camera.update(16,player,{x:0,y:0});
    expect(camera.mode).toBe('look');expect(Math.abs(camera.position.x-player.x)).toBeGreaterThan(300);expect(Math.abs(camera.position.y-player.y)).toBeGreaterThan(300);expect(player).toEqual({x:2800,y:3000});
  });
  it('keeps LOOK target coherent while zooming and resets smoothly',()=>{
    const camera=new ArenaCamera(5600,4000,.62,1.38);camera.resize(390,844);const player={x:2800,y:3000};camera.position={...player};camera.panByScreen(180,0);camera.update(200,player,{x:0,y:0});const looked=camera.position.x;
    camera.setZoom(1.3);camera.update(200,player,{x:0,y:0});expect(camera.mode).toBe('look');expect(camera.position.x).not.toBe(player.x);const beforeReset=Math.abs(camera.position.x-player.x);
    camera.resetFollow();camera.update(16,player,{x:0,y:0});expect(camera.mode).toBe('follow');expect(Math.abs(camera.position.x-player.x)).toBeLessThan(beforeReset);expect(looked).not.toBe(player.x);
  });
  it('converts world positions to minimap coordinates, not screen coordinates',()=>{
    expect(worldToMinimap({x:0,y:0},HARVEST_ARENA_MAP,76)).toEqual({x:0,y:0});expect(worldToMinimap({x:5600,y:4000},HARVEST_ARENA_MAP,76)).toEqual({x:76,y:76});
  });
  it('caps mutation fallbacks below the base silhouette',()=>{expect(Math.max(...Object.values(MUTATION_VISUAL_SCALE))).toBeLessThanOrEqual(.52)});
});
