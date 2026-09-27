import type { Vec2 } from './ArenaTypes';
import type { MapCollider } from './MapDefinition';

export class WorldCollisionSystem{
  constructor(private readonly colliders:readonly MapCollider[],private readonly playerRadius=42){}
  resolve(position:Vec2):Vec2{
    let result={...position};
    for(const collider of this.colliders)result=resolveCollider(result,collider,this.playerRadius);
    return result;
  }
}

function resolveCollider(point:Vec2,c:MapCollider,padding:number):Vec2{
  const dx=point.x-c.center.x,dy=point.y-c.center.y;
  if(c.shape==='circle')return resolveEllipse(point,c.center,(c.radius??0)+padding,(c.radius??0)+padding);
  if(c.shape==='ellipse')return resolveEllipse(point,c.center,(c.radiusX??0)+padding,(c.radiusY??0)+padding);
  const hx=(c.halfWidth??0)+padding,hy=(c.halfHeight??0)+padding;
  if(Math.abs(dx)>=hx||Math.abs(dy)>=hy)return point;
  const px=hx-Math.abs(dx),py=hy-Math.abs(dy);
  return px<py?{x:c.center.x+(dx<0?-hx:hx),y:point.y}:{x:point.x,y:c.center.y+(dy<0?-hy:hy)};
}
function resolveEllipse(point:Vec2,center:Vec2,rx:number,ry:number):Vec2{
  const dx=point.x-center.x,dy=point.y-center.y,n=(dx*dx)/(rx*rx)+(dy*dy)/(ry*ry);
  if(n>=1)return point;
  if(n<1e-8)return{x:center.x,y:center.y+ry};
  const factor=1/Math.sqrt(n);return{x:center.x+dx*factor,y:center.y+dy*factor};
}
