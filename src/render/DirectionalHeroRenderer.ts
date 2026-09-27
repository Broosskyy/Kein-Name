import { Sprite, Texture } from 'pixi.js';
import type { AssetRegistry } from '../assets';
import { heroDirectionAsset, heroDirectionFromVector, type HeroDirection } from '../gameplay/HeroDirection';
import type { Vec2 } from '../gameplay/ArenaTypes';

/** Presentation-only directional animation. Simulation never depends on this class. */
export class DirectionalHeroRenderer {
  readonly sprite = new Sprite(Texture.EMPTY);
  direction: HeroDirection = 's';
  private elapsedMs = 0;
  private lastKey = '';
  private production = false;
  private action?:'dash'|'attack';
  private actionMs=0;

  constructor(private readonly assets: AssetRegistry) {
    this.sprite.anchor.set(.5, .78);
    this.sprite.scale.set(235 / 384);
    this.refresh('idle');
  }

  get hasDirectionalProduction(): boolean { return this.production; }

  face(vector: Vec2): void {
    this.direction = heroDirectionFromVector(vector, this.direction);
  }

  trigger(action:'dash'|'attack',durationMs:number):void{this.action=action;this.actionMs=Math.max(this.actionMs,durationMs)}

  update(deltaMs: number, velocity: Vec2): void {
    this.elapsedMs += deltaMs;
    this.actionMs=Math.max(0,this.actionMs-deltaMs);if(this.actionMs===0)this.action=undefined;
    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed > 3) this.face(velocity);
    const moving = speed > 8;
    // The run pose is held most of the cadence, with a brief authored idle/contact
    // pose acting as the second frame. Locomotion adds restrained squash and bob.
    const runContact = Math.floor(this.elapsedMs / 145) % 2 === 1;
    this.refresh(this.action??(moving && !runContact ? 'run' : 'idle'));
  }

  private refresh(pose: 'idle'|'run'|'dash'|'attack'): void {
    const key = heroDirectionAsset(this.direction, pose);
    if (key === this.lastKey) return;
    const texture = this.assets.texture(key);
    const fallback = this.assets.texture('creature.base');
    this.production = Boolean(texture);
    this.sprite.texture = texture ?? fallback ?? Texture.EMPTY;
    this.sprite.visible = this.sprite.texture !== Texture.EMPTY;
    this.lastKey = key;
  }
}
