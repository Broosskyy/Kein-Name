import type { Vec2 } from './ArenaTypes';

export interface CameraViewport { x: number; y: number; width: number; height: number }

export class ArenaCamera {
  position: Vec2 = { x: 1600, y: 1050 };
  target: Vec2 = { ...this.position };
  zoom = 0.92;
  targetZoom = 0.92;
  viewport: CameraViewport = { x: 0, y: 300, width: 390, height: 500 };
  private shake: Vec2 = { x: 0, y: 0 };
  private shakePower = 0;
  constructor(readonly worldWidth: number, readonly worldHeight: number, readonly minZoom: number, readonly maxZoom: number) {}
  resize(width: number, height: number): void {
    this.viewport = height >= width ? { x: 0, y: height * 0.34, width, height: height * 0.56 } : { x: width * 0.16, y: height * 0.28, width: width * 0.68, height: height * 0.68 };
    this.clampPosition();
  }
  setZoom(value: number): number { this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, value)); return this.targetZoom; }
  update(deltaMs: number, player: Vec2, velocity: Vec2): void {
    const speed = Math.hypot(velocity.x, velocity.y), look = Math.min(190, speed * 0.28), nx = speed > 1 ? velocity.x / speed : 0, ny = speed > 1 ? velocity.y / speed : 0;
    this.target = { x: player.x + nx * look, y: player.y + ny * look - 90 };
    const dx = this.target.x - this.position.x, dy = this.target.y - this.position.y, follow = 1 - Math.exp(-deltaMs / 220);
    if (Math.abs(dx) > 90 / this.zoom) this.position.x += (dx - Math.sign(dx) * 90 / this.zoom) * follow;
    if (Math.abs(dy) > 60 / this.zoom) this.position.y += (dy - Math.sign(dy) * 60 / this.zoom) * follow;
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-deltaMs / 150));
    this.shakePower *= Math.exp(-deltaMs / 90); this.shake = { x: (Math.random()*2-1)*this.shakePower, y: (Math.random()*2-1)*this.shakePower };
    this.clampPosition();
  }
  impulse(power: number): void { this.shakePower = Math.max(this.shakePower, power); }
  emphasize(kind: 'breakpoint'|'mutation'|'kill'|'cycle'): void { const delta = kind === 'mutation' ? .06 : kind === 'kill' ? -.08 : -.035; this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom + delta)); }
  worldToScreen(world: Vec2): Vec2 { const s=this.scale; return {x:this.viewport.x+this.viewport.width/2+(world.x-this.position.x)*s+this.shake.x,y:this.viewport.y+this.viewport.height/2+(world.y-this.position.y)*s+this.shake.y}; }
  screenToWorld(screen: Vec2): Vec2 { const s=this.scale; return {x:this.position.x+(screen.x-this.viewport.x-this.viewport.width/2-this.shake.x)/s,y:this.position.y+(screen.y-this.viewport.y-this.viewport.height/2-this.shake.y)/s}; }
  get scale(): number { return (this.viewport.width / 1500) * this.zoom; }
  private clampPosition(): void { const hw=this.viewport.width/(2*Math.max(.001,this.scale)),hh=this.viewport.height/(2*Math.max(.001,this.scale)); this.position.x=clamp(this.position.x,Math.min(hw,this.worldWidth/2),Math.max(this.worldWidth-hw,this.worldWidth/2));this.position.y=clamp(this.position.y,Math.min(hh,this.worldHeight/2),Math.max(this.worldHeight-hh,this.worldHeight/2)); }
}
function clamp(v:number,min:number,max:number):number{return Math.max(min,Math.min(max,v));}
