export type RunModeId = 'solo' | 'group' | 'country' | 'world' | 'event';

export interface RunModeDefinition {
  id: RunModeId;
  name: string;
  implemented: boolean;
  resumable: boolean;
  renderedPlayers: readonly [number, number];
  authority: 'local-prototype' | 'future-server';
  aggregation: 'none' | 'instance' | 'country-contribution' | 'world-contribution';
}

export const RUN_MODES: Readonly<Record<RunModeId, RunModeDefinition>> = {
  solo: { id: 'solo', name: 'SOLO RUN', implemented: true, resumable: true, renderedPlayers: [1, 1], authority: 'local-prototype', aggregation: 'none' },
  event: { id: 'event', name: 'EVENT RUN', implemented: true, resumable: true, renderedPlayers: [1, 1], authority: 'local-prototype', aggregation: 'none' },
  group: { id: 'group', name: 'GROUP RUN', implemented: false, resumable: false, renderedPlayers: [2, 8], authority: 'future-server', aggregation: 'instance' },
  country: { id: 'country', name: 'COUNTRY RUN', implemented: false, resumable: false, renderedPlayers: [1, 8], authority: 'future-server', aggregation: 'country-contribution' },
  world: { id: 'world', name: 'WORLD RUN', implemented: false, resumable: false, renderedPlayers: [1, 8], authority: 'future-server', aggregation: 'world-contribution' },
};
