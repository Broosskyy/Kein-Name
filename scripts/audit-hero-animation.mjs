import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const directory = path.join(root, 'public/assets/creature/directional');
const files = (await fs.readdir(directory)).filter((file) => /^creature-(n|ne|e|se|s|sw|w|nw)-(idle|run|dash|attack)\.webp$/.test(file)).sort();
const assets = [];

for (const file of files) {
  const target = path.join(directory, file);
  const metadata = await sharp(target).metadata();
  const { data, info } = await sharp(target).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alphaBounds = bounds(data, info.width, info.height, info.channels, 0);
  const opaqueBounds = bounds(data, info.width, info.height, info.channels, 220);
  if (!alphaBounds || !opaqueBounds) throw new Error(`Hero asset has no visible pixels: ${file}`);
  const [, direction, state] = file.match(/^creature-(n|ne|e|se|s|sw|w|nw)-(idle|run|dash|attack)\.webp$/) ?? [];
  const footBaseline = alphaBounds.top + alphaBounds.height - 1;
  const padding = {
    left: alphaBounds.left,
    right: info.width - alphaBounds.left - alphaBounds.width,
    top: alphaBounds.top,
    bottom: info.height - alphaBounds.top - alphaBounds.height,
  };
  const anomalies = [];
  if (info.width !== 384 || info.height !== 384) anomalies.push('canvas-size');
  if (padding.left < 12 || padding.right < 12 || padding.top < 12 || padding.bottom < 12) anomalies.push('tight-crop');
  if (Math.abs(padding.left - padding.right) > 78) anomalies.push('horizontal-centering');
  if (footBaseline < 315 || footBaseline > 352) anomalies.push('foot-baseline');
  if (metadata.hasAlpha !== true) anomalies.push('missing-alpha');
  assets.push({ file, direction, state, dimensions: { width: info.width, height: info.height }, alphaBounds, opaqueBounds, footBaseline, padding, centerX: alphaBounds.left + alphaBounds.width / 2, anomalies });
}

const expected = 8 * 4;
const report = {
  generatedAt: new Date().toISOString(),
  milestone: 'M10.4',
  expectedAssets: expected,
  actualAssets: assets.length,
  sharedCanvas: { width: 384, height: 384 },
  targetFootAnchor: 40 / 384,
  anomalyCount: assets.reduce((sum, asset) => sum + asset.anomalies.length, 0),
  assets,
};
if (assets.length !== expected) throw new Error(`Expected ${expected} directional Hero assets, found ${assets.length}`);
await fs.mkdir(path.join(root, 'production-assets/audit'), { recursive: true });
await fs.writeFile(path.join(root, 'production-assets/audit/hero-animation-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Audited ${assets.length} Hero assets (${report.anomalyCount} flagged properties)`);

function bounds(data, width, height, channels, threshold) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * channels + 3] <= threshold) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return right < left ? undefined : { left, top, width: right - left + 1, height: bottom - top + 1 };
}
