import type { EventDefinition } from './EventDefinition';
import { createInitialEventState, isEventState, type EventState } from './EventState';

export interface EventStoragePort {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export class BrowserEventStorage implements EventStoragePort {
  read(key: string): string | null { return localStorage.getItem(key); }
  write(key: string, value: string): void { localStorage.setItem(key, value); }
  remove(key: string): void { localStorage.removeItem(key); }
}

export class EventStore {
  readonly key: string;

  constructor(private readonly definition: EventDefinition, private readonly storage: EventStoragePort) {
    this.key = `mutation-boss:event:${definition.id}`;
  }

  load(): EventState {
    try {
      const raw = this.storage.read(this.key);
      if (!raw) return createInitialEventState(this.definition.id, this.definition.eventConfigVersion);
      const parsed: unknown = JSON.parse(raw);
      return isEventState(parsed, this.definition.id, this.definition.eventConfigVersion)
        ? parsed
        : createInitialEventState(this.definition.id, this.definition.eventConfigVersion);
    } catch {
      return createInitialEventState(this.definition.id, this.definition.eventConfigVersion);
    }
  }

  save(state: EventState): void {
    try { this.storage.write(this.key, JSON.stringify(state)); } catch { /* local persistence is best-effort in the prototype */ }
  }
  reset(): EventState {
    try { this.storage.remove(this.key); } catch { /* retain a clean in-memory state */ }
    return createInitialEventState(this.definition.id, this.definition.eventConfigVersion);
  }
}
