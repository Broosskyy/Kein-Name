import type { GameDomainEvent } from '../core/DomainEvents';
import type { RunResult } from '../types';
import type { EventDefinition } from './EventDefinition';
import { EventProgress, type EventRunOutcome } from './EventProgress';
import { BrowserEventStorage, EventStore, type EventStoragePort } from './EventStore';

export class EventRuntime {
  enabled: boolean;
  readonly progress: EventProgress;
  lastOutcome?: EventRunOutcome;

  constructor(
    readonly definition: EventDefinition,
    emit: (event: GameDomainEvent) => void,
    storage: EventStoragePort = new BrowserEventStorage(),
  ) {
    this.enabled = definition.enabled;
    this.progress = new EventProgress(definition, new EventStore(definition, storage), emit);
  }

  processRun(run: RunResult): EventRunOutcome | undefined {
    if (!this.enabled || run.eventId !== this.definition.id) return undefined;
    this.lastOutcome = this.progress.applyRun(run);
    return this.lastOutcome;
  }

  setEnabled(enabled: boolean): void { this.enabled = enabled; this.lastOutcome = undefined; }
}
