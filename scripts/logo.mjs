import opentype from 'opentype.js';
import sharp from 'sharp';
import fs from 'fs';
const anton = opentype.parse(fs.readFileSync('node_modules/@fontsource/anton/files/anton-latin-400-normal.woff').buffer);
const G = '#00753D', K = '#111111';
const path = (font, text, x, y, size, ls = 0) => {
  let d = '', cx = x;
  for (const ch of text) { const g = font.charToGlyph(ch); d += g.getPath(cx, y, size).toPathData(2); cx += g.advanceWidth * size / font.unitsPerEm + ls; }
  return { d, w: cx - x - ls };
};
const W = path(anton, 'WW', 0, 0, 120);
const ww = path(anton, 'WW', 150 - W.w / 2, 150 + 42, 120);
const t1 = path(anton, 'WIEN WEST', 320, 170, 150, 4);
const t2 = path(anton, 'STICKER', 324, 250, 64, 22);
const width = Math.ceil(Math.max(320 + t1.w, 324 + t2.w) + 20);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="300" viewBox="0 0 ${width} 300">
<circle cx="150" cy="150" r="140" fill="${G}"/><circle cx="150" cy="150" r="122" fill="none" stroke="#fff" stroke-width="10"/>
<path d="${ww.d}" fill="#fff"/><path d="${t1.d}" fill="${K}"/><path d="${t2.d}" fill="${G}"/></svg>`;
fs.mkdirSync('public/brand', { recursive: true });
fs.writeFileSync('public/brand/logo.svg', svg);
await sharp(Buffer.from(svg)).resize({ height: 300 }).png().toFile('public/brand/logo.png');
// Badge quadratisch (Favicon / Social)
const badge = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><circle cx="150" cy="150" r="140" fill="${G}"/><circle cx="150" cy="150" r="122" fill="none" stroke="#fff" stroke-width="10"/><path d="${ww.d}" fill="#fff"/></svg>`;
await sharp(Buffer.from(badge)).resize(512, 512).png().toFile('public/brand/badge.png');
console.log(width);
