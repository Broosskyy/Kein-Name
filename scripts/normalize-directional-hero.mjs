import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const directory = path.join(root, 'public/assets/creature/directional');
const files = (await fs.readdir(directory)).filter((file) => file.endsWith('.webp')).sort();
const audit = [];

for (const file of files) {
  const target = path.join(directory, file);
  const { data, info } = await sharp(target).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = new Uint8Array(info.width * info.height);
  for (let index = 0; index < alpha.length; index += 1) alpha[index] = data[index * info.channels + 3];
  const components = connectedComponents(alpha, info.width, info.height, 10);
  const main = components.sort((a, b) => b.pixels.length - a.pixels.length)[0];
  if (!main) throw new Error(`No visible Hero component in ${file}`);

  const keep = dilate(main.pixels, info.width, info.height, 2);
  const cleaned = Buffer.from(data);
  let removedPixels = 0;
  for (let index = 0; index < alpha.length; index += 1) {
    if (!keep[index] && cleaned[index * info.channels + 3] > 0) {
      cleaned[index * info.channels + 3] = 0;
      removedPixels += 1;
    }
  }
  const bounds = alphaBounds(cleaned, info.width, info.height, info.channels);
  if (!bounds) throw new Error(`Cleanup removed Hero in ${file}`);
  const crop = await sharp(cleaned, { raw: info })
    .extract({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height })
    .png()
    .toBuffer();
  const normalized = await sharp({ create: { width: 384, height: 384, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp(crop).resize(318, 300, { fit: 'contain', position: 'bottom', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: 33, top: 44 }])
    .webp({ quality: 94, alphaQuality: 100, smartSubsample: true })
    .toBuffer();
  await fs.writeFile(target, normalized);
  audit.push({ file, sourceComponents: components.length, removedPixels, sourceBounds: bounds, outputFootAnchor: 40 / 384 });
}

await fs.mkdir(path.join(root, 'production-assets/audit'), { recursive: true });
await fs.writeFile(path.join(root, 'production-assets/audit/hero-directional-audit.json'), `${JSON.stringify({ generatedAt: 'M10.3', assets: audit }, null, 2)}\n`);
console.log(`Normalized and audited ${audit.length} directional Hero assets`);

function connectedComponents(alpha, width, height, threshold) {
  const visited = new Uint8Array(alpha.length);
  const components = [];
  const queue = new Int32Array(alpha.length);
  for (let start = 0; start < alpha.length; start += 1) {
    if (visited[start] || alpha[start] <= threshold) continue;
    let head = 0, tail = 0;
    queue[tail++] = start; visited[start] = 1;
    const pixels = [];
    while (head < tail) {
      const index = queue[head++]; pixels.push(index);
      const x = index % width, y = Math.floor(index / width);
      const neighbors = [index - 1, index + 1, index - width, index + width];
      for (let slot = 0; slot < neighbors.length; slot += 1) {
        const next = neighbors[slot];
        if (next < 0 || next >= alpha.length || visited[next] || alpha[next] <= threshold) continue;
        if (slot === 0 && x === 0 || slot === 1 && x === width - 1 || slot === 2 && y === 0 || slot === 3 && y === height - 1) continue;
        visited[next] = 1; queue[tail++] = next;
      }
    }
    components.push({ pixels });
  }
  return components;
}

function dilate(pixels, width, height, radius) {
  const keep = new Uint8Array(width * height);
  for (const index of pixels) {
    const x = index % width, y = Math.floor(index / width);
    for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) keep[ny * width + nx] = 1;
    }
  }
  return keep;
}

function alphaBounds(data, width, height, channels) {
  let left = width, right = -1, top = height, bottom = -1;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * channels + 3] === 0) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  return right < left ? undefined : { left, top, width: right - left + 1, height: bottom - top + 1 };
}
