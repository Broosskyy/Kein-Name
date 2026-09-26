import type { Vec2 } from './ArenaTypes';

export interface CameraViewport { x:number;y:number;width:number;height:number }
export type CameraMode = 'follow'|'look'|'boss-focus'|'tactical';

export class ArenaCamera {
  position:Vec2={x:2800,y:2850}; target:Vec2={...this.position};
  zoom=.92;targetZoom=.92;mode:CameraMode='follow';
  viewport:CameraViewport={x:0,y:80,width:390,height:700};
  readonly manualOffset:Vec2={x:0,y:0};
  private manualIdleMs=0;private shake:Vec2={x:0,y:0};private shakePower=0;private focusTarget?:Vec2;

  constructor(readonly worldWidth:number,readonly worldHeight:number,readonly minZoom:number,readonly maxZoom:number){}
  resize(width:number,height:number):void{this.viewport=height>=width?{x:0,y:height*.105,width,height:height*.805}:{x:width*.055,y:height*.09,width:width*.89,height:height*.83};this.clampPosition()}
  setZoom(value:number):number{this.targetZoom=clamp(value,this.minZoom,this.maxZoom);return this.targetZoom}
  setMode(mode:CameraMode,focusTarget?:Vec2):void{this.mode=mode;this.focusTarget=focusTarget?{...focusTarget}:undefined;if(mode==='tactical')this.setZoom(this.minZoom+.07)}
  panByScreen(dx:number,dy:number):void{this.mode='look';this.manualIdleMs=0;this.manualOffset.x-=dx/Math.max(.001,this.scale);this.manualOffset.y-=dy/Math.max(.001,this.scale);const limitX=this.viewport.width/Math.max(.001,this.scale)*.72,limitY=this.viewport.height/Math.max(.001,this.scale)*.72;this.manualOffset.x=clamp(this.manualOffset.x,-limitX,limitX);this.manualOffset.y=clamp(this.manualOffset.y,-limitY,limitY)}
  resetFollow():void{this.mode='follow';this.focusTarget=undefined;this.manualIdleMs=100000}
  update(deltaMs:number,player:Vec2,velocity:Vec2):void{
    this.manualIdleMs+=deltaMs;
    const speed=Math.hypot(velocity.x,velocity.y),nx=speed>1?velocity.x/speed:0,ny=speed>1?velocity.y/speed:0;
    const look=Math.min(205,speed*.255);
    if(this.mode==='boss-focus'&&this.focusTarget){this.target={x:(player.x+this.focusTarget.x)/2,y:(player.y+this.focusTarget.y)/2}}
    else this.target={x:player.x+nx*look+this.manualOffset.x,y:player.y+ny*look+this.manualOffset.y};
    if(this.mode==='follow'&&this.manualIdleMs>1500){const decay=Math.exp(-deltaMs/520);this.manualOffset.x*=decay;this.manualOffset.y*=decay;if(Math.abs(this.manualOffset.x)+Math.abs(this.manualOffset.y)<2){this.manualOffset.x=0;this.manualOffset.y=0}}
    const dx=this.target.x-this.position.x,dy=this.target.y-this.position.y;
    const deadX=(this.mode==='look'?18:82)/this.zoom,deadY=(this.mode==='look'?18:64)/this.zoom;
    const follow=1-Math.exp(-deltaMs/(this.mode==='look'?112:188));
    if(Math.abs(dx)>deadX)this.position.x+=(dx-Math.sign(dx)*deadX)*follow;
    if(Math.abs(dy)>deadY)this.position.y+=(dy-Math.sign(dy)*deadY)*follow;
    this.zoom+=(this.targetZoom-this.zoom)*(1-Math.exp(-deltaMs/130));
    this.shakePower*=Math.exp(-deltaMs/76);this.shake={x:(Math.random()*2-1)*this.shakePower,y:(Math.random()*2-1)*this.shakePower};this.clampPosition();
  }
  impulse(power:number):void{this.shakePower=Math.max(this.shakePower,power)}
  emphasize(kind:'breakpoint'|'mutation'|'kill'|'cycle'):void{const delta=kind==='mutation'?.05:kind==='kill'?-.09:-.04;this.zoom=clamp(this.zoom+delta,this.minZoom,this.maxZoom)}
  worldToScreen(world:Vec2):Vec2{const s=this.scale;return{x:this.viewport.x+this.viewport.width/2+(world.x-this.position.x)*s+this.shake.x,y:this.viewport.y+this.viewport.height/2+(world.y-this.position.y)*s+this.shake.y}}
  screenToWorld(screen:Vec2):Vec2{const s=this.scale;return{x:this.position.x+(screen.x-this.viewport.x-this.viewport.width/2-this.shake.x)/s,y:this.position.y+(screen.y-this.viewport.y-this.viewport.height/2-this.shake.y)/s}}
  get scale():number{return(this.viewport.width/1850)*this.zoom}
  private clampPosition():void{const hw=this.viewport.width/(2*Math.max(.001,this.scale)),hh=this.viewport.height/(2*Math.max(.001,this.scale));this.position.x=clamp(this.position.x,Math.min(hw,this.worldWidth/2),Math.max(this.worldWidth-hw,this.worldWidth/2));this.position.y=clamp(this.position.y,Math.min(hh,this.worldHeight/2),Math.max(this.worldHeight-hh,this.worldHeight/2))}
}
function clamp(v:number,min:number,max:number):number{return Math.max(min,Math.min(max,v))}
