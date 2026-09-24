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
  const eventRuntime = new EventRuntime(HALLOWEEN_2026, (event) => events.emit(event));
  events.subscribe((event) => { if (event.type === 'RUN_COMPLETED') eventRuntime.processRun(event.result); });
  const model = new CombatModel(performance.now(), {
    emit: (event) => events.emit(event),
    eventDefinition: HALLOWEEN_2026,
    eventEnabled: eventRuntime.enabled,
  });
  const scene = new GameScene(app, ui, audio, model, events, assets, eventRuntime);
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
