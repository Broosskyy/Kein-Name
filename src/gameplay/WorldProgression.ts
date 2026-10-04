export const CLASS_HERO_LEVEL_REQUIREMENT = 15;
export const CLASS_JOB_LEVEL_REQUIREMENT = 20;

export type HeroClassId = 'vanguard' | 'ranger' | 'arcanist';

export interface HeroClassDefinition {
  id: HeroClassId;
  name: string;
  description: string;
  combatRole: string;
}

export const HERO_CLASSES: readonly HeroClassDefinition[] = [
  { id: 'vanguard', name: 'Vanguard', description: 'Armored close-range guardian with decisive breaks.', combatRole: 'FRONTLINE' },
  { id: 'ranger', name: 'Ranger', description: 'Mobile ranged hunter built around precise projectiles.', combatRole: 'RANGED' },
  { id: 'arcanist', name: 'Arcanist', description: 'Core-channeling caster with zones and burst damage.', combatRole: 'CONTROL' },
];

export interface WorldProgressionSnapshot {
  heroLevel: number;
  heroXp: number;
  jobLevel: number;
  jobXp: number;
  classId?: HeroClassId;
}

export class WorldProgression {
  heroLevel: number;
  heroXp: number;
  jobLevel: number;
  jobXp: number;
  classId?: HeroClassId;

  constructor(snapshot: WorldProgressionSnapshot = { heroLevel: 1, heroXp: 0, jobLevel: 1, jobXp: 0 }) {
    this.heroLevel = Math.max(1, Math.floor(snapshot.heroLevel));
    this.heroXp = Math.max(0, Math.floor(snapshot.heroXp));
    this.jobLevel = Math.max(1, Math.floor(snapshot.jobLevel));
    this.jobXp = Math.max(0, Math.floor(snapshot.jobXp));
    this.classId = snapshot.classId;
  }

  get heroXpToNext(): number { return heroXpToNext(this.heroLevel); }
  get jobXpToNext(): number { return jobXpToNext(this.jobLevel); }
  get classSelectionEligible(): boolean {
    return !this.classId && this.heroLevel >= CLASS_HERO_LEVEL_REQUIREMENT && this.jobLevel >= CLASS_JOB_LEVEL_REQUIREMENT;
  }

  grant(heroXp: number, jobXp: number): Readonly<{ heroLevels: number; jobLevels: number }> {
    const beforeHero = this.heroLevel, beforeJob = this.jobLevel;
    this.heroXp += Math.max(0, Math.round(heroXp));
    this.jobXp += Math.max(0, Math.round(jobXp));
    while (this.heroXp >= this.heroXpToNext) { this.heroXp -= this.heroXpToNext; this.heroLevel += 1; }
    while (this.jobXp >= this.jobXpToNext) { this.jobXp -= this.jobXpToNext; this.jobLevel += 1; }
    return { heroLevels: this.heroLevel - beforeHero, jobLevels: this.jobLevel - beforeJob };
  }

  chooseClass(classId: HeroClassId): boolean {
    if (!this.classSelectionEligible || !HERO_CLASSES.some((definition) => definition.id === classId)) return false;
    this.classId = classId;
    return true;
  }

  snapshot(): WorldProgressionSnapshot {
    return { heroLevel: this.heroLevel, heroXp: this.heroXp, jobLevel: this.jobLevel, jobXp: this.jobXp, classId: this.classId };
  }
}

export function heroXpToNext(level: number): number { return 90 + Math.max(0, level - 1) * 38; }
export function jobXpToNext(level: number): number { return 70 + Math.max(0, level - 1) * 31; }

