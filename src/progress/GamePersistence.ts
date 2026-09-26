import { PLAYER_PROGRESS_VERSION, createPlayerProgress, type PlayerProgress } from './PlayerProgress';
import type { ArenaRunSnapshot } from '../gameplay/ArenaRunModel';

export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export const SAVE_KEY = 'mutation-boss:m06:progress';
export const RUN_KEY = 'mutation-boss:m06:solo-run';

export class GamePersistence {
  constructor(private readonly storage: StoragePort) {}
  loadProgress(): PlayerProgress {
    try {
      const raw = this.storage.getItem(SAVE_KEY); if (!raw) return createPlayerProgress();
      const parsed = JSON.parse(raw) as PlayerProgress;
      if (parsed.schemaVersion !== PLAYER_PROGRESS_VERSION || !parsed.guestId) return createPlayerProgress();
      return parsed;
    } catch { return createPlayerProgress(); }
  }
  saveProgress(progress: PlayerProgress): void { this.storage.setItem(SAVE_KEY, JSON.stringify(progress)); }
  loadRun(): ArenaRunSnapshot | undefined {
    try { const raw = this.storage.getItem(RUN_KEY); if (!raw) return undefined; const parsed = JSON.parse(raw) as ArenaRunSnapshot; return (parsed.schemaVersion === 1 || parsed.schemaVersion === 2 || parsed.schemaVersion === 3) && parsed.eligible ? parsed : undefined; }
    catch { this.storage.removeItem(RUN_KEY); return undefined; }
  }
  saveRun(snapshot: ArenaRunSnapshot): void { this.storage.setItem(RUN_KEY, JSON.stringify(snapshot)); }
  clearRun(): void { this.storage.removeItem(RUN_KEY); }
  resetAll(): void { this.storage.removeItem(SAVE_KEY); this.storage.removeItem(RUN_KEY); }
}
