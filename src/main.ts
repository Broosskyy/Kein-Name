import { Application } from 'pixi.js';
import { AssetRegistry } from './assets';
import { ProceduralAudioBus } from './audio/AudioBus';
import { ACTIVE_QUALITY } from './config';
import { CombatModel } from './core/CombatModel';
import { DomainEventBus } from './core/DomainEvents';
import { HALLOWEEN_2026 } from './event/EventDefinition';
import { EventRuntime } from './event/EventRuntime';
import { AppLifecycle } from './platform/AppLifecycle';
import { GameScene } from './render/GameScene';
import { GameUI } from './ui/GameUI';
import './styles.css';
import { ArenaRunModel } from './gameplay/ArenaRunModel';
import { GamePersistence } from './progress/GamePersistence';
import { awardPersistentProgress } from './progress/PlayerProgress';
import { FullscreenController } from './platform/FullscreenController';
import { Hybrid3DVerticalSlice } from './world3d/Hybrid3DVerticalSlice';
import { HarvestWorldVerticalSlice } from './world3d/HarvestWorldVerticalSlice';
import type { WorldProgressionSnapshot } from './gameplay/WorldProgression';

async function bootstrapLegacy(): Promise<void> {
  const mount = document.getElementById('game-canvas');
  const shell = document.getElementById('game-shell');
  if (!mount) throw new Error('Missing #game-canvas mount');
  if (!shell) throw new Error('Missing #game-shell');

  const app = new Application();
  await app.init({
    resizeTo: mount,
    background: '#090b16',
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, ACTIVE_QUALITY.dpr),
    preference: 'webgl',
    powerPreference: 'high-performance',
  });
  app.canvas.setAttribute('aria-hidden', 'true');
  mount.appendChild(app.canvas);

  const audio = new ProceduralAudioBus();
  const assets = new AssetRegistry();
  await assets.preload();
  const ui = new GameUI(assets);
  const events = new DomainEventBus();
  const persistence = new GamePersistence(localStorage);
  const playerProgress = persistence.loadProgress();
  const eventRuntime = new EventRuntime(HALLOWEEN_2026, (event) => events.emit(event));
  events.subscribe((event) => {
    if (event.type !== 'RUN_COMPLETED') return;
    eventRuntime.processRun(event.result);
    awardPersistentProgress(playerProgress, event.result.bossCyclesCleared ?? 1, event.result.totalDamage, event.result.pickupCount ?? 0);
    persistence.saveProgress(playerProgress); persistence.clearRun();
  });
  const model = new CombatModel(performance.now(), {
    emit: (event) => events.emit(event),
    eventDefinition: HALLOWEEN_2026,
    eventEnabled: eventRuntime.enabled,
  });
  playerProgress.statistics.runsStarted += 1; persistence.saveProgress(playerProgress);
  const arena = new ArenaRunModel(model, playerProgress.guestId, eventRuntime.enabled ? 'event' : 'solo');
  let scene: GameScene;
  const fullscreen = new FullscreenController(document, shell, () => { app.resize(); scene?.resize(); });
  scene = new GameScene(app, ui, audio, model, events, assets, eventRuntime, {
    arena,
    resumeSnapshot: persistence.loadRun(),
    saveSnapshot: (snapshot) => persistence.saveRun(snapshot),
    clearSnapshot: () => persistence.clearRun(),
    toggleFullscreen: () => fullscreen.toggle(),
    inspectProgress: () => console.info('M06 PlayerProgress', playerProgress),
    initialZoom: typeof playerProgress.settings.arenaZoom === 'number' ? playerProgress.settings.arenaZoom : undefined,
    saveZoom: (zoom) => { playerProgress.settings.arenaZoom = zoom; persistence.saveProgress(playerProgress); },
  });
  const lifecycle = new AppLifecycle({
    pause: (nowMs) => scene.pause(nowMs),
    resume: (nowMs) => scene.resume(nowMs),
    resize: () => {
      app.resize();
      scene.resize();
    },
  });
  window.addEventListener('beforeunload', () => {
    lifecycle.destroy();
    scene.destroy();
  }, { once: true });

  document.documentElement.dataset.ready = 'true';
}

async function bootstrapHybrid(): Promise<void> {
  const mount = document.getElementById('game-canvas');
  const shell = document.getElementById('game-shell');
  if (!mount) throw new Error('Missing #game-canvas mount');
  if (!shell) throw new Error('Missing #game-shell');
  document.body.classList.add('hybrid-3d');
  const assets = new AssetRegistry();
  // The hybrid renderer owns its Three.js textures. Waiting here for the
  // complete Pixi catalog decoded every arena, boss, VFX and hidden preview
  // image before the first world frame. On real phones that looked like a
  // frozen start and duplicated the same Hero textures in GPU memory.
  // GameUI keeps graceful procedural/CSS fallbacks, so hybrid startup must not
  // be gated by the legacy Pixi catalog.
  const ui = new GameUI(assets);
  const events = new DomainEventBus();
  const eventRuntime = new EventRuntime(HALLOWEEN_2026, (event) => events.emit(event));
  const model = new CombatModel(performance.now(), {
    emit: (event) => events.emit(event),
    eventDefinition: HALLOWEEN_2026,
    eventEnabled: eventRuntime.enabled,
    seedGenerator: () => 0x10a3d,
  });
  const persistence = new GamePersistence(localStorage);
  const map = new URLSearchParams(location.search).get('map');
  const scene = map === 'raid'
    ? new Hybrid3DVerticalSlice(mount, ui, model)
    : new HarvestWorldVerticalSlice(mount, ui, model, {
      load: (): WorldProgressionSnapshot => {
        const progress = persistence.loadProgress();
        return { heroLevel: progress.playerLevel, heroXp: progress.playerXp, jobLevel: progress.jobLevel, jobXp: progress.jobXp, classId: progress.classId };
      },
      save: (snapshot): void => {
        const progress = persistence.loadProgress();
        progress.playerLevel = snapshot.heroLevel; progress.playerXp = snapshot.heroXp;
        progress.jobLevel = snapshot.jobLevel; progress.jobXp = snapshot.jobXp; progress.classId = snapshot.classId;
        progress.updatedAt = new Date().toISOString(); persistence.saveProgress(progress);
      },
    });
  const fullscreen = new FullscreenController(document, shell, () => scene.resize());
  ui.bindFullscreen(() => fullscreen.toggle());
  const lifecycle = new AppLifecycle({
    pause: () => scene.pause(),
    resume: () => scene.resume(),
    resize: () => scene.resize(),
  });
  window.addEventListener('beforeunload', () => { lifecycle.destroy(); scene.destroy(); }, { once: true });
  document.documentElement.dataset.ready = 'true';
  document.documentElement.dataset.renderer = 'hybrid-3d';
}

const useLegacyRenderer = new URLSearchParams(location.search).get('renderer') === '2d';
(useLegacyRenderer ? bootstrapLegacy() : bootstrapHybrid()).catch((error: unknown) => {
  console.error(error);
  const shell = document.getElementById('game-shell');
  if (shell) shell.innerHTML = '<div class="fatal">Mutation Boss could not start.<br>Please reload the page.</div>';
});
