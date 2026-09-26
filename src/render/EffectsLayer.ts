import { Container, Graphics, Text } from 'pixi.js';
import { GAME_CONFIG } from '../config';
import { visualRandom } from './VisualRandom';
import type { VisualQualityController } from './VisualQuality';

interface Particle {
  view: Graphics;
  active: boolean;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  gravity: number;
  spin: number;
}

interface FloatingText {
  view: Text;
  active: boolean;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
}

interface Shockwave {
  view: Graphics;
  active: boolean;
  life: number;
  maxLife: number;
}

export class EffectsLayer extends Container {
  private readonly particles: Particle[] = [];
  private readonly texts: FloatingText[] = [];
  private readonly shockwaves: Shockwave[] = [];

  constructor(private readonly quality: VisualQualityController) {
    super();
    for (let index = 0; index < GAME_CONFIG.quality.high.maxParticles; index += 1) {
      const view = new Graphics().circle(0, 0, 4).fill(0xffffff);
      view.visible = false;
      this.addChild(view);
      this.particles.push({ view, active: false, life: 0, maxLife: 0, vx: 0, vy: 0, gravity: 0, spin: 0 });
    }
    for (let index = 0; index < GAME_CONFIG.quality.high.maxFloatingTexts; index += 1) {
      const view = new Text({
        text: '0',
        style: { fontFamily: 'Arial, sans-serif', fontSize: 28, fontWeight: '800', fill: 0xffffff, stroke: { color: 0x10131f, width: 5 } },
      });
      view.anchor.set(0.5);
      view.visible = false;
      this.addChild(view);
      this.texts.push({ view, active: false, life: 0, maxLife: 0, vx: 0, vy: 0 });
    }
    for (let index = 0; index < GAME_CONFIG.quality.high.maxShockwaves; index += 1) {
      const view = new Graphics().circle(0, 0, 30).stroke({ color: 0xffffff, width: 5, alpha: 0.8 });
      view.visible = false;
      this.addChild(view);
      this.shockwaves.push({ view, active: false, life: 0, maxLife: 0 });
    }
  }

  activeCounts(): Readonly<{ particles: number; texts: number; shockwaves: number }> {
    return {
      particles: this.particles.filter((item) => item.active).length,
      texts: this.texts.filter((item) => item.active).length,
      shockwaves: this.shockwaves.filter((item) => item.active).length,
    };
  }

  burst(x: number, y: number, color: number, requestedCount: number, power = 1): void {
    const profile = this.quality.profile;
    const count = Math.max(1, Math.round(requestedCount * profile.particles));
    let emitted = 0;
    for (let index = 0; index < profile.maxParticles; index += 1) {
      const particle = this.particles[index];
      if (particle.active) continue;
      const angle = visualRandom.next() * Math.PI * 2;
      const speed = visualRandom.range(90, 340) * power;
      particle.active = true;
      particle.life = 0;
      particle.maxLife = visualRandom.range(280, 700);
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 60 * power;
      particle.gravity = 260 * power;
      particle.spin = visualRandom.centered(8);
      particle.view.clear().poly([-5, -2, 5, 0, -3, 4]).fill({ color, alpha: 0.95 });
      particle.view.position.set(x, y);
      particle.view.scale.set(visualRandom.range(0.5, 1.6));
      particle.view.rotation = visualRandom.next() * Math.PI;
      particle.view.alpha = 1;
      particle.view.visible = true;
      emitted += 1;
      if (emitted >= count) break;
    }
  }

  debrisBurst(x: number, y: number, color: number, requestedCount: number, power = 1): void {
    const profile = this.quality.profile;
    const count = Math.min(profile.maxDebris, Math.max(1, Math.round(requestedCount * profile.particles)));
    let emitted = 0;
    for (let index = 0; index < profile.maxParticles; index += 1) {
      const particle = this.particles[index];
      if (particle.active) continue;
      const angle = visualRandom.range(Math.PI * 1.08, Math.PI * 1.92);
      const speed = visualRandom.range(130, 380) * power;
      particle.active = true;
      particle.life = 0;
      particle.maxLife = visualRandom.range(520, 980);
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 90 * power;
      particle.gravity = 520 * power;
      particle.spin = visualRandom.centered(10);
      const size = visualRandom.range(5, 12) * power;
      particle.view.clear().poly([-size, -size * 0.55, size * 0.85, -size * 0.25, size * 0.55, size, -size * 0.8, size * 0.65]).fill({ color, alpha: 0.98 });
      particle.view.position.set(x, y);
      particle.view.scale.set(1);
      particle.view.rotation = visualRandom.next() * Math.PI;
      particle.view.alpha = 1;
      particle.view.visible = true;
      emitted += 1;
      if (emitted >= count) break;
    }
  }

  trail(x: number, y: number, color: number, size = 5): void {
    const profile = this.quality.profile;
    const particle = this.particles.find((candidate, index) => index < profile.maxParticles && !candidate.active);
    if (!particle) return;
    particle.active = true;
    particle.life = 0;
    particle.maxLife = 170;
    particle.vx = visualRandom.centered(18);
    particle.vy = visualRandom.centered(18);
    particle.gravity = 0;
    particle.spin = visualRandom.centered(2);
    particle.view.clear().circle(0, 0, size).fill({ color, alpha: 0.42 });
    particle.view.position.set(x, y);
    particle.view.scale.set(1);
    particle.view.alpha = 0.7;
    particle.view.visible = true;
  }

  damageNumber(x: number, y: number, amount: number, isPower: boolean, color = 0xffffff): void {
    const item = this.texts.find((candidate, index) => index < this.quality.profile.maxFloatingTexts && !candidate.active);
    if (!item) return;
    item.active = true;
    item.life = 0;
    item.maxLife = isPower ? 900 : 650;
    item.vx = visualRandom.centered(25);
    item.vy = isPower ? -115 : -80;
    item.view.text = `${Math.round(amount)}`;
    item.view.style.fontSize = isPower ? 43 : 27;
    item.view.style.fill = color;
    const nearby=this.texts.filter((candidate)=>candidate.active&&Math.abs(candidate.view.x-x)<52&&Math.abs(candidate.view.y-y)<70).length;
    item.view.position.set(x + visualRandom.centered(24)+(nearby%2?22:-22), y - 20-nearby*15);
    item.view.scale.set(0.45);
    item.view.alpha = 1;
    item.view.visible = true;
  }

  shockwave(x: number, y: number, color: number, strength = 1): void {
    const item = this.shockwaves.find((candidate, index) => index < this.quality.profile.maxShockwaves && !candidate.active);
    if (!item) return;
    item.active = true;
    item.life = 0;
    item.maxLife = 420 * strength;
    item.view.clear().circle(0, 0, 30).stroke({ color, width: 5, alpha: 0.85 });
    item.view.position.set(x, y);
    item.view.scale.set(0.2);
    item.view.alpha = 1;
    item.view.visible = true;
  }

  update(deltaMs: number): void {
    const delta = deltaMs / 1000;
    for (const particle of this.particles) {
      if (!particle.active) continue;
      particle.life += deltaMs;
      particle.vy += particle.gravity * delta;
      particle.view.x += particle.vx * delta;
      particle.view.y += particle.vy * delta;
      particle.view.rotation += particle.spin * delta;
      particle.view.alpha = Math.max(0, 1 - particle.life / particle.maxLife);
      if (particle.life >= particle.maxLife) this.releaseParticle(particle);
    }
    for (const item of this.texts) {
      if (!item.active) continue;
      item.life += deltaMs;
      item.view.x += item.vx * delta;
      item.view.y += item.vy * delta;
      const progress = item.life / item.maxLife;
      const punch = progress < 0.18 ? 0.45 + progress / 0.18 * 0.7 : 1.15 - (progress - 0.18) * 0.18;
      item.view.scale.set(punch);
      item.view.alpha = Math.min(1, (1 - progress) * 1.5);
      if (item.life >= item.maxLife) {
        item.active = false;
        item.view.visible = false;
      }
    }
    for (const item of this.shockwaves) {
      if (!item.active) continue;
      item.life += deltaMs;
      const progress = item.life / item.maxLife;
      item.view.scale.set(0.2 + progress * 3.8);
      item.view.alpha = (1 - progress) * 0.9;
      if (item.life >= item.maxLife) {
        item.active = false;
        item.view.visible = false;
      }
    }
  }

  clearAll(): void {
    for (const particle of this.particles) this.releaseParticle(particle);
    for (const item of this.texts) {
      item.active = false;
      item.view.visible = false;
    }
    for (const item of this.shockwaves) {
      item.active = false;
      item.view.visible = false;
    }
  }

  private releaseParticle(particle: Particle): void {
    particle.active = false;
    particle.view.visible = false;
  }
}
