export type BossDirectionalView = 'front'|'front-left'|'left'|'rear-left'|'rear'|'rear-right'|'right'|'front-right';

const ORDER: readonly BossDirectionalView[] = ['front', 'front-right', 'right', 'rear-right', 'rear', 'rear-left', 'left', 'front-left'];

export class BossDirectionalState {
  view: BossDirectionalView = 'front';
  private lockMs = 0;

  update(deltaMs: number, cameraAngle: number, bossOrientation: number): BossDirectionalView {
    this.lockMs = Math.max(0, this.lockMs - deltaMs);
    const relative = wrapAngle(cameraAngle - bossOrientation);
    const currentIndex = ORDER.indexOf(this.view);
    const currentAngle = currentIndex * Math.PI / 4;
    const candidate = ORDER[(Math.round(relative / (Math.PI / 4)) + 8) % 8];
    if (candidate !== this.view && this.lockMs <= 0 && Math.abs(wrapAngle(relative - currentAngle)) >= Math.PI / 8 + .075) {
      this.view = candidate;
      this.lockMs = 120;
    }
    return this.view;
  }
}

export function bossViewFromAngle(cameraAngle: number, bossOrientation: number): BossDirectionalView {
  const relative = wrapAngle(cameraAngle - bossOrientation);
  return ORDER[(Math.round(relative / (Math.PI / 4)) + 8) % 8];
}

export function bossViewAsset(view: BossDirectionalView): `boss.halloween.view.${BossDirectionalView}` {
  return `boss.halloween.view.${view}`;
}

export function bossViewAnchor(view: BossDirectionalView): number {
  if (view === 'rear') return .1074;
  if (view === 'rear-right' || view === 'right') return .0996;
  if (view === 'rear-left') return .0918;
  return .0898;
}

export function bossViewSector(view: BossDirectionalView): 'front'|'flank'|'rear' {
  if (view === 'front' || view === 'front-left' || view === 'front-right') return 'front';
  if (view === 'rear' || view === 'rear-left' || view === 'rear-right') return 'rear';
  return 'flank';
}

function wrapAngle(angle: number): number { return Math.atan2(Math.sin(angle), Math.cos(angle)); }
