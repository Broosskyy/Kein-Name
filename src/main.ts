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

async function bootstrap(): Promise<void> {
  const mount = document.getElementById('game-canvas');
  if (!mount) throw new Error('Missing #game-canvas mount');

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
  const fullscreen = new FullscreenController(document, document.documentElement, () => { app.resize(); scene?.resize(); });
  scene = new GameScene(app, ui, audio, model, events, assets, eventRuntime, {
    arena,
    resumeSnapshot: persistence.loadRun(),
    saveSnapshot: (snapshot) => persistence.saveRun(snapshot),
    clearSnapshot: () => persistence.clearRun(),
    toggleFullscreen: () => { void fullscreen.toggle(); },
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

bootstrap().catch((error: unknown) => {
  console.error(error);
  const shell = document.getElementById('game-shell');
  if (shell) shell.innerHTML = '<div class="fatal">Mutation Boss could not start.<br>Please reload the page.</div>';
});
