import { access, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'production-assets/source/ui');
const runtimeUiDir = path.join(root, 'public/assets/ui/harvest');
const runtimeHeroDir = path.join(root, 'public/assets/creature/evo1');

await Promise.all([sourceDir, runtimeUiDir, runtimeHeroDir].map((directory) => mkdir(directory, { recursive: true })));

const sourceFiles = {
  combat: 'harvest-combat-hud-master.png',
  hero: 'hero-evo1-4x8-master.png',
  buttonsA: 'harvest-buttons-tabs-a.png',
  buttonsB: 'harvest-buttons-tabs-b.png',
  buttonsC: 'harvest-buttons-tabs-c.png',
  mockup: 'harvest-meta-master-mockup.png',
  widgets: 'harvest-widget-master.png',
  panelsGold: 'harvest-panels-gold-master.png',
  panelsCrystal: 'harvest-panels-crystal-master.png',
};

const uploads = {
  combat: '../upload/01-200777.png',
  hero: '../upload/02-200574.png',
  buttonsA: '../upload/03-200512.png',
  buttonsB: '../upload/04-200498.png',
  buttonsC: '../upload/05-200510.png',
  mockup: '../upload/06-200081.png',
  widgets: '../upload/07-200175.png',
  panelsGold: '../upload/08-200206.png',
  panelsCrystal: '../upload/09-200177.png',
};

for (const [key, upload] of Object.entries(uploads)) {
  const destination = path.join(sourceDir, sourceFiles[key]);
  try { await access(destination); }
  catch {
    const source = path.resolve(root, upload);
    try { await copyFile(source, destination); }
    catch { throw new Error(`Missing production master ${sourceFiles[key]}. Restore it under production-assets/source/ui/.`); }
  }
}

async function alphaFromBlack(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let index = 0; index < data.length; index += 4) {
    const value = Math.max(data[index], data[index + 1], data[index + 2]);
    if (value <= 5) data[index + 3] = 0;
    else if (value < 18) data[index + 3] = Math.round(data[index + 3] * (value - 5) / 13);
  }
  return sharp(data, { raw: info });
}

async function exportRegion(sourceName, outputName, region, options = {}) {
  const source = path.join(sourceDir, sourceName);
  const cropped = await sharp(source).extract(region).png().toBuffer();
  let image = await alphaFromBlack(cropped);
  if (options.isolate) {
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    isolateLargestComponent(data, info);
    image = sharp(data, { raw: info });
  }
  let pipeline = image.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 });
  if (options.resize) pipeline = pipeline.resize(options.resize.width, options.resize.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
  await pipeline.webp({ quality: options.quality ?? 88, alphaQuality: 100, smartSubsample: true }).toFile(path.join(runtimeUiDir, outputName));
}

const crystalSheet = sourceFiles.panelsCrystal;
await Promise.all([
  exportRegion(crystalSheet, 'panel-large-horizontal.webp', { left: 22, top: 45, width: 1492, height: 342 }),
  exportRegion(crystalSheet, 'panel-medium-horizontal.webp', { left: 25, top: 420, width: 1182, height: 280 }),
  exportRegion(crystalSheet, 'panel-medium-rect.webp', { left: 25, top: 725, width: 440, height: 320 }),
  exportRegion(crystalSheet, 'panel-square.webp', { left: 465, top: 725, width: 420, height: 320 }),
  exportRegion(crystalSheet, 'panel-tall-vertical.webp', { left: 1205, top: 510, width: 315, height: 620 }),
]);

const buttonSheet = sourceFiles.buttonsC;
await Promise.all([
  exportRegion(buttonSheet, 'button-primary.webp', { left: 38, top: 66, width: 430, height: 170 }, { resize: { width: 520, height: 192 } }),
  exportRegion(buttonSheet, 'button-primary-active.webp', { left: 485, top: 66, width: 380, height: 170 }, { resize: { width: 520, height: 192 } }),
  exportRegion(buttonSheet, 'button-disabled.webp', { left: 862, top: 66, width: 380, height: 170 }, { resize: { width: 520, height: 192 } }),
  exportRegion(buttonSheet, 'nav-back.webp', { left: 1215, top: 75, width: 165, height: 300 }, { resize: { width: 192, height: 192 }, isolate: true }),
  exportRegion(buttonSheet, 'nav-close.webp', { left: 1365, top: 75, width: 165, height: 300 }, { resize: { width: 192, height: 192 }, isolate: true }),
]);

const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
const poses = ['idle', 'run', 'dash', 'attack'];
const heroSource = path.join(sourceDir, sourceFiles.hero);
const heroRaw = await alphaFromBlack(heroSource);
const heroBuffer = await heroRaw.extend({ top: 32, bottom: 32, left: 32, right: 32, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
const cellWidth = 192;
const cellHeight = 192;
const expandedCell = 240;

function isolateLargestComponent(data, info, target = undefined) {
  const visited = new Uint8Array(info.width * info.height);
  let best = [];
  let bestScore = -Infinity;
  for (let start = 0; start < visited.length; start += 1) {
    if (visited[start] || data[start * 4 + 3] < 36) continue;
    const stack = [start];
    visited[start] = 1;
    const component = [];
    while (stack.length) {
      const current = stack.pop();
      const x = current % info.width, y = Math.floor(current / info.width);
      component.push(current);
      const neighbours = [current - 1, current + 1, current - info.width, current + info.width];
      for (const next of neighbours) {
        if (next < 0 || next >= visited.length || visited[next]) continue;
        const nx = next % info.width, ny = Math.floor(next / info.width);
        if (Math.abs(nx - x) + Math.abs(ny - y) !== 1 || data[next * 4 + 3] < 36) continue;
        visited[next] = 1; stack.push(next);
      }
    }
    const center = component.reduce((sum, pixel) => ({ x: sum.x + pixel % info.width, y: sum.y + Math.floor(pixel / info.width) }), { x: 0, y: 0 });
    center.x /= component.length; center.y /= component.length;
    const distanceSq = target ? (center.x - target.x) ** 2 + (center.y - target.y) ** 2 : 0;
    const score = component.length - distanceSq * .4;
    if (score > bestScore) { best = component; bestScore = score; }
  }
  const keep = new Uint8Array(info.width * info.height);
  const stack = [...best];
  for (const pixel of best) keep[pixel] = 1;
  while (stack.length) {
    const current = stack.pop();
    const x = current % info.width, y = Math.floor(current / info.width);
    for (const next of [current - 1, current + 1, current - info.width, current + info.width]) {
      if (next < 0 || next >= keep.length || keep[next] || data[next * 4 + 3] === 0) continue;
      const nx = next % info.width, ny = Math.floor(next / info.width);
      if (Math.abs(nx - x) + Math.abs(ny - y) !== 1) continue;
      keep[next] = 1; stack.push(next);
    }
  }
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let pixel = 0; pixel < keep.length; pixel += 1) {
    if (!keep[pixel]) data[pixel * 4 + 3] = 0;
    else {
      const x = pixel % info.width, y = Math.floor(pixel / info.width);
      left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
  }
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

for (let row = 0; row < poses.length; row += 1) {
  for (let column = 0; column < directions.length; column += 1) {
    const cropLeft = column * cellWidth + 8;
    const cropTop = row * cellHeight + 8;
    const { data, info } = await sharp(heroBuffer)
      .extract({ left: cropLeft, top: cropTop, width: expandedCell, height: expandedCell })
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    // Remove the sheet's direction/state captions without touching the creature.
    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const sourceX = cropLeft - 32 + x, sourceY = cropTop - 32 + y;
        if (sourceY < 47 || sourceX < 72) data[(y * info.width + x) * 4 + 3] = 0;
      }
    }

    const bounds = isolateLargestComponent(data, info, { x: 120, y: 120 });
    const isolated = await sharp(data, { raw: info }).extract(bounds)
      .resize(348, 348, { fit: 'inside', withoutEnlargement: false })
      .png().toBuffer({ resolveWithObject: true });
    const left = Math.round((384 - isolated.info.width) / 2);
    const top = Math.max(0, 364 - isolated.info.height);
    await sharp({ create: { width: 384, height: 384, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: isolated.data, left, top }])
      .webp({ quality: 90, alphaQuality: 100, smartSubsample: true })
      .toFile(path.join(runtimeHeroDir, `hero-evo1-${directions[column]}-${poses[row]}.webp`));
  }
}

console.log('Harvest UI extraction complete: 10 UI assets, 32 Evo 1 directional states, 9 source masters.');
