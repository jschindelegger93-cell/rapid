// Rendert alle Motive (ohne Packs) in 600 dpi für den Druck: 90 × 60 mm = 2126 × 1417 px
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const ROOT = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'scripts/sticker.mjs'), 'utf8');
const list = src.slice(src.indexOf('const P = ['));
const slugs = [...list.matchAll(/^\s*\['([a-z0-9-]+)', '[^']*', '(\w+)'/gm)].filter((m) => !['pack', 'mystery'].includes(m[2])).map((m) => m[1]);
const out = path.join(ROOT, 'druck/png');
fs.mkdirSync(out, { recursive: true });
let i = 0;
for (const s of slugs) {
  i++;
  const svg = fs.readFileSync(path.join(ROOT, 'public/sticker', `${s}.svg`));
  await sharp(svg, { density: 600 }).resize(2126, 1417).flatten({ background: '#ffffff' }).png().toFile(path.join(out, `${String(i).padStart(2, '0')}-${s}.png`));
}
console.log(slugs.length, 'Motive gerendert');
