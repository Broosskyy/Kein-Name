import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { ASSET_MANIFEST, type AssetKey } from '../src/assets';
import { HARVEST_ARENA_MAP, MASTER_COMPOSITION_SCENARIO } from '../src/gameplay/HarvestArenaMap';

const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'offline-qa');
mkdirSync(output,{recursive:true});
const cache=new Map<AssetKey,string>();

function asset(key:AssetKey):string{
  const prior=cache.get(key);if(!prior)throw new Error(`Offline PNG cache missing ${key}`);return prior;
}

async function preload(keys:readonly AssetKey[]):Promise<void>{
  for(const key of new Set(keys)){
    const src=ASSET_MANIFEST[key].src;if(!src)throw new Error(`Missing runtime src for ${key}`);
    const path=resolve(root,'public',src.slice(1));
    const png=await sharp(readFileSync(path)).png().toBuffer();
    cache.set(key,`data:image/png;base64,${png.toString('base64')}`);
  }
}

interface View{x:number;y:number;width:number;height:number;outputWidth:number;outputHeight:number;title:string}
const image=(key:AssetKey,x:number,y:number,width:number,height:number,rotation=0,alpha=1,anchorBottom=false)=>{
  const px=x-width/2,py=anchorBottom?y-height:y-height/2;
  return `<image href="${asset(key)}" x="${px}" y="${py}" width="${width}" height="${height}" opacity="${alpha}" preserveAspectRatio="xMidYMid meet" transform="rotate(${rotation*180/Math.PI} ${x} ${y})"/>`;
};

function render(view:View):string{
  const map=HARVEST_ARENA_MAP;
  const terrain=map.terrainPatches.map((patch)=>image(patch.key,patch.x,patch.y,patch.width,patch.width,patch.rotation,patch.alpha)).join('');
  const details=map.groundDetails.map((detail)=>image(detail.key,detail.x,detail.y,detail.width,detail.width,detail.rotation,detail.alpha)).join('');
  const corridors=map.traversalCorridors.map((corridor)=>`<path d="M${corridor.from.x} ${corridor.from.y} L${corridor.to.x} ${corridor.to.y}" stroke="#77717d" stroke-opacity=".12" stroke-width="${corridor.halfWidth*1.5}"/><path d="M${corridor.from.x} ${corridor.from.y} L${corridor.to.x} ${corridor.to.y}" stroke="#b1a6ad" stroke-opacity=".08" stroke-width="12"/>`).join('');
  const zones=map.zones.map((zone)=>`<ellipse cx="${zone.center.x}" cy="${zone.center.y}" rx="${zone.radius.x}" ry="${zone.radius.y}" fill="#302832" fill-opacity=".12"/>`).join('');
  const worldProps=[...map.structures,...map.props].sort((a,b)=>a.y-b.y).map((prop)=>image(prop.key,prop.x,prop.y,prop.height*1.25,prop.height,0,.98,true)).join('');
  const boss=image('boss.halloween.base',map.bossSpawn.x,map.bossSpawn.y+260,1500,1500,0,1,true);
  const hero=image('creature.direction.n.idle',MASTER_COMPOSITION_SCENARIO.hero.x,MASTER_COMPOSITION_SCENARIO.hero.y,280,280,0,1,true);
  const dummies=MASTER_COMPOSITION_SCENARIO.dummies.map((point,index)=>image(index%2?'creature.direction.ne.idle':'creature.direction.nw.idle',point.x,point.y,230,230,0,.95,true)).join('');
  const loot=MASTER_COMPOSITION_SCENARIO.loot.map((point,index)=>image(index?'loot.rare':'loot.epic',point.x,point.y,120,120)).join('');
  const telegraphs=`<ellipse cx="3700" cy="2950" rx="260" ry="145" fill="#ff5b32" fill-opacity=".08" stroke="#ff8a52" stroke-opacity=".85" stroke-width="20" stroke-dasharray="48 28"/><path d="M2380 2600 L3100 2420" stroke="#c47cff" stroke-opacity=".18" stroke-width="160"/><path d="M2380 2600 L3100 2420" stroke="#e0a1ff" stroke-opacity=".8" stroke-width="18" stroke-dasharray="54 26"/>`;
  const labelSize=Math.max(42,view.width*.028);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${view.outputWidth}" height="${view.outputHeight}" viewBox="${view.x} ${view.y} ${view.width} ${view.height}">
  <defs><filter id="shadow"><feGaussianBlur stdDeviation="18"/></filter></defs>
  <rect x="0" y="0" width="${map.width}" height="${map.height}" fill="#15151d"/>
  ${zones}${corridors}${terrain}${details}
  <ellipse cx="${map.bossSpawn.x}" cy="${map.bossSpawn.y+210}" rx="710" ry="270" fill="#020208" fill-opacity=".58" filter="url(#shadow)"/>
  ${worldProps}${boss}${loot}${dummies}${hero}${telegraphs}
  <g><rect x="${view.x+34}" y="${view.y+34}" width="${Math.min(view.width-68,920)}" height="${labelSize*1.8}" rx="24" fill="#070910" fill-opacity=".82" stroke="#e1a36d" stroke-opacity=".5" stroke-width="4"/><text x="${view.x+62}" y="${view.y+34+labelSize*1.18}" fill="#f5e7d5" font-family="Arial,sans-serif" font-size="${labelSize}" font-weight="700">OFFLINE QA · ${view.title}</text></g>
  </svg>`;
}

async function writeAudit(name:string,view:View):Promise<string>{
  const png=resolve(output,`${name}.png`);
  await sharp(Buffer.from(render(view))).png({compressionLevel:9}).toFile(png);
  return png;
}

await preload([
  ...HARVEST_ARENA_MAP.terrainPatches.map((item)=>item.key),...HARVEST_ARENA_MAP.groundDetails.map((item)=>item.key),
  ...HARVEST_ARENA_MAP.structures.map((item)=>item.key),...HARVEST_ARENA_MAP.props.map((item)=>item.key),
  'boss.halloween.base','creature.direction.n.idle','creature.direction.ne.idle','creature.direction.nw.idle','loot.rare','loot.epic',
]);
await writeAudit('m09-3-full-map-audit',{x:0,y:0,width:5600,height:4000,outputWidth:1400,outputHeight:1000,title:'FULL MAP'});
const lookUp=await writeAudit('m09-3-camera-look-up',{x:2050,y:160,width:1500,height:2635,outputWidth:600,outputHeight:1054,title:'LOOK UP'});
const master=await writeAudit('m09-3-portrait-master-composition',{x:2050,y:1200,width:1500,height:2635,outputWidth:600,outputHeight:1054,title:'PORTRAIT MASTER'});
const lookDown=await writeAudit('m09-3-camera-look-down',{x:2300,y:2244,width:1000,height:1756,outputWidth:600,outputHeight:1054,title:'LOOK DOWN'});
await sharp({create:{width:1800,height:1054,channels:4,background:'#090a10'}}).composite([
  {input:lookUp,left:0,top:0},{input:master,left:600,top:0},{input:lookDown,left:1200,top:0},
]).png({compressionLevel:9}).toFile(resolve(output,'m09-3-camera-views-audit.png'));
console.log(`M09.3 offline QA generated in ${output}`);
