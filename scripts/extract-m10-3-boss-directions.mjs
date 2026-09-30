import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, 'production-assets/source/harvest-colossus-directional-kit-01.png');
const output = path.join(root, 'public/assets/boss/directional');
const cells = [
  ['front',       { left: 31,   top: 16,  width: 489, height: 425 }],
  ['front-left',  { left: 528,  top: 16,  width: 431, height: 425 }],
  ['left',        { left: 987,  top: 16,  width: 239, height: 425 }],
  ['rear-left',   { left: 1291, top: 16,  width: 455, height: 425 }],
  ['rear',        { left: 20,   top: 445, width: 483, height: 422 }],
  ['rear-right',  { left: 512,  top: 445, width: 386, height: 422 }],
  ['right',       { left: 957,  top: 445, width: 255, height: 422 }],
  ['front-right', { left: 1279, top: 445, width: 479, height: 422 }],
];

await fs.mkdir(output, { recursive: true });
for (const [name, crop] of cells) {
  const horizontal = 512 - crop.width;
  const vertical = 512 - crop.height;
  await sharp(source)
    .extract(crop)
    .extend({
      left: Math.floor(horizontal / 2), right: Math.ceil(horizontal / 2),
      top: Math.floor(vertical / 2), bottom: Math.ceil(vertical / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 92, alphaQuality: 100, smartSubsample: true })
    .toFile(path.join(output, `harvest-colossus-${name}.webp`));
}

console.log(`Extracted ${cells.length} aligned Harvest Colossus views to ${path.relative(root, output)}`);
