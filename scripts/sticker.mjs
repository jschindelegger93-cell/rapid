// Erzeugt 30 Sticker-Designs im Kurven-Look (einheitlich 900×600 = ca. 9 × 6 cm) + 6 Packs (Markdown für Astro/Sveltia) und die Grafiken (SVG + PNG).
// Stil: flach, wenige Farben, Strick-Schal, Block-Streifen, Sprühlack, Schablone, abgenutzter Druck.
// Aufruf: npm run sticker            → nur Grafiken neu
//         npm run sticker -- --md    → zusätzlich Markdown-Dateien (überschreibt!)
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const load = (pkg, file) =>
  opentype.parse(fs.readFileSync(path.join(ROOT, `node_modules/@fontsource/${pkg}/files/${file}`)).buffer);
const F = {
  anton: load('anton', 'anton-latin-400-normal.woff'),
  block: load('bungee', 'bungee-latin-400-normal.woff'),
  marker: load('permanent-marker', 'permanent-marker-latin-400-normal.woff'),
  stencil: load('black-ops-one', 'black-ops-one-latin-400-normal.woff'),
  graffiti: load('sedgwick-ave-display', 'sedgwick-ave-display-latin-400-normal.woff'),
  pixel: load('silkscreen', 'silkscreen-latin-400-normal.woff'),
};
const OUT_IMG = path.join(ROOT, 'public/sticker');
const OUT_MD = path.join(ROOT, 'src/content/sticker');
fs.mkdirSync(OUT_IMG, { recursive: true });
fs.mkdirSync(OUT_MD, { recursive: true });

// Farben (bewusst wenige, wie Siebdruck)
const G = '#1E8C3A';
const GD = '#0F5226';
const W = '#FFFFFF';
const CREME = '#F3F1EA';
const K = '#151515';
const V = '#5B2A86';
const R = '#C8102E';
const B = '#2B3990'; // Blau (Kurven-Farben)
const RR = '#D7262E'; // Rot (Kurven-Farben)
/** Blau-Rot-Band */
const blauRot = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h / 2}" fill="${B}"/><rect x="${x}" y="${y + h / 2}" width="${w}" height="${h / 2}" fill="${RR}"/>`;
const SKIN = '#D9A27C';

// ---------- Helfer ----------
let SEED = 1;
const rnd = () => ((SEED = (SEED * 16807) % 2147483647) - 1) / 2147483646;
const seedOf = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 11) || 11;

/** Text als Pfad, zentriert. o: font, stroke, sw, skew, shadow:[dx,dy,color], ls (letter spacing) */
function txt(str, cx, y, size, maxW, fill, o = {}) {
  const font = F[o.font || 'anton'];
  const ls = o.ls || 0;
  const widthAt = (s) => font.getAdvanceWidth(str, s) + ls * (str.length - 1) * (s / size);
  let s = size;
  if (widthAt(s) > maxW) s = (s * maxW) / widthAt(s);
  const w = widthAt(s);
  let d;
  if (ls) {
    let x = cx - w / 2;
    d = [...str].map((c) => { const p = font.getPath(c, x, y, s).toPathData(2); x += font.getAdvanceWidth(c, s) + ls * (s / size); return p; }).join('');
  } else d = font.getPath(str, cx - w / 2, y, s).toPathData(2);
  const t = o.skew ? ` transform="translate(${cx} ${y}) skewX(${o.skew}) translate(${-cx} ${-y})"` : '';
  const sh = o.shadow ? `<path d="${d}" fill="${o.shadow[2]}" transform="translate(${o.shadow[0]} ${o.shadow[1]})"/>` : '';
  const st = o.stroke ? `<path d="${d}" fill="${o.stroke}" stroke="${o.stroke}" stroke-width="${o.sw || 8}" stroke-linejoin="round"${t}/>` : '';
  return `${sh}${st}<path d="${d}" fill="${fill}"${t}/>`;
}
/** Text auf Kreisbogen */
function arc(str, cx, cy, r, size, fill, unten = false, fontKey = 'block', spacing = 3) {
  const font = F[fontKey];
  const chars = [...str];
  const ws = chars.map((c) => font.getAdvanceWidth(c, size) + spacing);
  const total = ws.reduce((a, b) => a + b, 0) - spacing;
  let cum = 0;
  return chars.map((c, i) => {
    const w = ws[i] - spacing; const mid = cum + w / 2; cum += ws[i];
    const a = unten ? (total / 2 - mid) / r : (mid - total / 2) / r;
    const off = unten ? r + size * 0.78 : -r;
    return `<path d="${font.getPath(c, -w / 2, 0, size).toPathData(2)}" fill="${fill}" transform="translate(${cx} ${cy}) rotate(${((a * 180) / Math.PI).toFixed(2)}) translate(0 ${off.toFixed(1)})"/>`;
  }).join('');
}
/** Abgenutzter Druck: helle Flecken + feine Körnung über der Fläche */
function grunge(w, h, id, staerke = 1) {
  const s = Math.floor(rnd() * 900) + 1;
  return `<defs>
    <filter id="ga${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${0.03 + rnd() * 0.015}" numOctaves="4" seed="${s}"/><feColorMatrix type="matrix" values="0 0 0 0 0.97  0 0 0 0 0.96  0 0 0 0 0.93  0 0 0 ${28 * staerke} ${-20.6 * staerke - (1 - staerke) * 2}"/></filter>
    <filter id="gb${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${s + 7}"/><feColorMatrix type="matrix" values="0 0 0 0 0.97  0 0 0 0 0.96  0 0 0 0 0.93  0 0 0 30 -20.6"/></filter>
  </defs>
  <rect width="${w}" height="${h}" filter="url(#ga${id})" opacity=".55"/>
  <rect width="${w}" height="${h}" filter="url(#gb${id})" opacity=".35"/>`;
}
/** Sticker-Grundform mit weißem Schnittrand, Inhalt wird geclippt, Grunge drüber */
function form(w, h, inner, { rx = 18, rand = 14, rund = false, id = 'x', gr = 1 } = {}) {
  const clip = rund
    ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - rand}"/>`
    : `<rect x="${rand}" y="${rand}" width="${w - rand * 2}" height="${h - rand * 2}" rx="${Math.max(2, rx - rand / 2)}"/>`;
  const aussen = rund ? `<circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 2}" fill="${W}"/>` : `<rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="${rx}" fill="${W}"/>`;
  return `${aussen}<clipPath id="c${id}">${clip}</clipPath><g clip-path="url(#c${id})">${inner}${gr ? grunge(w, h, id, gr) : ''}</g>`;
}

// ---------- Strick-Schal ----------
/** Rastert Text in ein Maschen-Gitter (true = Buchstabe) */
async function maschen(str, cols, rows, fontKey = 'anton', fill = 0.8) {
  const font = F[fontKey];
  const H = rows * 10, Wd = cols * 10;
  let size = H * fill;
  let w = font.getAdvanceWidth(str, size);
  if (w > Wd * 0.92) { size *= (Wd * 0.92) / w; w = font.getAdvanceWidth(str, size); }
  const p = font.getPath(str, (Wd - w) / 2, H / 2 + size * 0.44, size).toPathData(2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wd}" height="${H}"><rect width="100%" height="100%" fill="#000"/><path d="${p}" fill="#fff"/></svg>`;
  const { data } = await sharp(Buffer.from(svg)).resize(cols, rows, { kernel: 'lanczos3' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => data[r * cols + c] > 128));
}
/** Farbraster als Rechteck-Läufe + Maschen-Muster drüber (schlanke SVG) */
function strick(farben, cw, id) {
  let out = '';
  farben.forEach((row, r) => {
    let c0 = 0;
    for (let c = 1; c <= row.length; c++) {
      if (c === row.length || row[c] !== row[c0]) {
        out += `<rect x="${c0 * cw}" y="${r * cw}" width="${(c - c0) * cw + 0.5}" height="${cw + 0.5}" fill="${row[c0]}"/>`;
        c0 = c;
      }
    }
  });
  const W2 = farben[0].length * cw, H2 = farben.length * cw;
  return `<defs><pattern id="m${id}" width="${cw}" height="${cw}" patternUnits="userSpaceOnUse"><path d="M${cw * 0.08} ${cw * 0.15}Q${cw * 0.28} ${cw * 0.95} ${cw * 0.5} ${cw * 0.9}M${cw * 0.92} ${cw * 0.15}Q${cw * 0.72} ${cw * 0.95} ${cw * 0.5} ${cw * 0.9}" stroke="#000" stroke-opacity=".2" stroke-width="${cw * 0.12}" fill="none"/></pattern></defs>${out}<rect width="${W2}" height="${H2}" fill="url(#m${id})"/>`;
}

/** Stephansdom, vereinfacht (eigene Zeichnung) */
function dom(cx, top, s = 1) {
  return `<g transform="translate(${cx - 150 * s} ${top}) scale(${s})" fill="${W}">
    <path d="M128 0 L136 70 L148 70 L156 150 L162 150 L162 310 L94 310 L94 150 L100 150 L108 70 L120 70 Z"/>
    <path d="M114 96h28M110 124h36" stroke="${G}" stroke-width="5"/>
    <rect x="102" y="200" width="52" height="8" fill="${G}"/><path d="M118 230h20v40h-20z" fill="${G}"/>
    <path d="M162 205 L200 140 L276 140 L300 205 Z"/>
    <path d="M178 196 L192 172 L206 196 L220 172 L234 196 L248 172 L262 196 L276 172 L290 196" stroke="${G}" stroke-width="5" fill="none"/>
    <rect x="162" y="205" width="138" height="105"/>
    <path d="M182 230v50M206 230v50M230 230v50M254 230v50M278 230v50" stroke="${G}" stroke-width="10" stroke-linecap="round"/>
    <rect x="30" y="170" width="64" height="140"/><path d="M30 170 L62 128 L94 170 Z"/>
    <path d="M52 200v60M72 200v60" stroke="${G}" stroke-width="8" stroke-linecap="round"/>
  </g>`;
}
/** Riesenrad, vereinfacht (eigene Zeichnung) */
function riesenrad(cx, cy, r) {
  let g = '';
  for (let i = 0; i < 15; i++) {
    const a = (Math.PI * 2 * i) / 15;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    g += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${W}" stroke-width="3"/>`;
    g += `<rect x="${(x - 13).toFixed(1)}" y="${(y + 4).toFixed(1)}" width="26" height="18" rx="4" fill="${W}"/>`;
  }
  return `<g>
    <path d="M${cx - r * 0.75} ${cy + r * 1.45} L${cx} ${cy} L${cx + r * 0.75} ${cy + r * 1.45}" stroke="${W}" stroke-width="12" fill="none" stroke-linejoin="round"/>
    <path d="M${cx - r * 0.5} ${cy + r * 0.95} H${cx + r * 0.5}" stroke="${W}" stroke-width="7"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${W}" stroke-width="9"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.86}" fill="none" stroke="${W}" stroke-width="3"/>
    ${g}<circle cx="${cx}" cy="${cy}" r="12" fill="${W}"/>
  </g>`;
}

// ---------- Vorlagen (alle 900 × 600) ----------
const SW = 900, SH = 600;
const T = {
  // Strick-Schal: Randstreifen Weiß/Blau/Rot, 1–2 Zeilen Strick-Schrift
  schal: async ({ zeilen, grund = G, schrift = W }) => {
    const cw = 6, cols = SW / cw, rows = SH / cw;
    const randOben = [W, W, W, W, W, B, B, B, B, RR, RR, RR, RR, W, W, W];
    const rand = randOben.length;
    const innen = rows - rand * 2;
    const proZeile = Math.floor(innen / zeilen.length);
    let grid = [];
    for (const z of zeilen) grid.push(...(await maschen(z, cols, proZeile, 'anton', zeilen.length > 1 ? 0.8 : 0.62)));
    while (grid.length < innen) grid.push(Array(cols).fill(false));
    const farben = [
      ...randOben.map((f) => Array(cols).fill(f)),
      ...grid.map((row) => row.map((v) => (v ? schrift : grund))),
      ...[...randOben].reverse().map((f) => Array(cols).fill(f)),
    ];
    const id = 's' + seedOf(zeilen.join());
    return form(SW, SH, strick(farben, cw, id), { id, gr: 0.6 });
  },
  // Strick-Schal zweifarbig (Freundschaft)
  schal2: async ({ zeilen }) => {
    const cw = 6, cols = SW / cw, rows = SH / cw, rand = 16;
    const innen = rows - rand * 2, pro = Math.floor(innen / zeilen.length);
    let grid = [];
    for (const z of zeilen) grid.push(...(await maschen(z, cols, pro, 'anton', 0.8)));
    while (grid.length < innen) grid.push(Array(cols).fill(false));
    const farben = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
      const links = c < cols / 2;
      if (r < rand || r >= rows - rand) { const rr = r < rand ? r : rows - 1 - r; return rr >= 5 && rr <= 12 ? (links ? G : R) : W; }
      return grid[r - rand][c] ? W : links ? G : K;
    }));
    return form(SW, SH, strick(farben, cw, 'f2'), { id: 'f2', gr: 0.6 });
  },
  // Block-Streifen: jede Zeile auf eigenem Streifen, Blau-Rot-Band unten
  block: ({ zeilen, farben = [G, GD] }) => {
    const pad = 22, band = 26, lh = (SH - pad * 2 - band) / zeilen.length;
    let inner = `<rect width="${SW}" height="${SH}" fill="${W}"/>`;
    zeilen.forEach((z, i) => {
      const y = pad + i * lh;
      inner += `<rect x="0" y="${y}" width="${SW}" height="${lh - 8}" fill="${farben[i % farben.length]}"/>`;
      inner += txt(z, SW / 2, y + (lh - 8) * 0.78, (lh - 8) * 0.78, SW - 100, W, { font: 'block', shadow: [7, 7, K] });
    });
    inner += blauRot(0, SH - pad - band, SW, band);
    return form(SW, SH, inner, { id: 'b' + seedOf(zeilen.join()) });
  },
  // Sprühlack: Fläche geteilt, Graffiti-Schrift, Farbnasen
  spray: ({ a, b, oben = G, unten = CREME, font = 'graffiti', schrift = W, strich = false }) => {
    SEED = seedOf(a + (b || ''));
    let drips = '';
    for (let x = 30; x < SW; x += 30 + rnd() * 50) { const l = 20 + rnd() * 70; drips += `<rect x="${x.toFixed(0)}" y="320" width="${(8 + rnd() * 10).toFixed(0)}" height="${l.toFixed(0)}" rx="6" fill="${oben}"/>`; }
    const inner = `<rect width="${SW}" height="${SH}" fill="${unten}"/><rect width="${SW}" height="330" fill="${oben}"/>${drips}
      ${txt(a, SW / 2, 300, 230, 800, schrift, { font, stroke: oben === G ? GD : K, sw: 10 })}
      ${strich ? `<path d="M110 250 L790 160" stroke="${G}" stroke-width="30" stroke-linecap="round"/>` : ''}
      ${b ? txt(b, SW / 2, 500, 84, 780, oben === G ? G : K, { font: 'marker' }) : ''}
      ${blauRot(0, 556, SW, 30)}`;
    return form(SW, SH, inner, { id: 'sp' + seedOf(a + (b || '')) });
  },
  // Streifen-Look (wie der lange Geländer-Sticker, quer): Linien oben/unten
  streifen: ({ a, b }) => {
    const linien = (y, dir) => [[G, 14], [B, 7], [RR, 7]].map(([f, h], i, arr) => {
      const off = arr.slice(0, i).reduce((s, x) => s + x[1] + 5, 0);
      return `<rect x="0" y="${dir > 0 ? y + off : y - off - h}" width="${SW}" height="${h}" fill="${f}"/>`;
    }).join('');
    const inner = `<rect width="${SW}" height="${SH}" fill="${W}"/>${linien(30, 1)}${linien(SH - 30, -1)}
      ${txt(a, SW / 2, b ? 290 : 350, 170, 780, G, { font: 'block' })}
      ${b ? txt(b, SW / 2, 440, 110, 780, K, { font: 'block' }) : ''}`;
    return form(SW, SH, inner, { id: 'l' + seedOf(a + (b || '')) });
  },
  // Schablone
  stencil: ({ a, b, grund = G, schrift = W, rahmen = W }) => {
    const inner = `<rect width="${SW}" height="${SH}" fill="${grund}"/>
      <rect x="40" y="40" width="${SW - 80}" height="${SH - 80}" fill="none" stroke="${rahmen}" stroke-width="8" stroke-dasharray="30 14"/>
      ${txt(a, SW / 2, b ? 320 : 370, 210, 760, schrift, { font: 'stencil' })}
      ${b ? txt(b, SW / 2, 460, 76, 740, rahmen, { font: 'stencil' }) : ''}
      ${blauRot(40, 512, SW - 80, 22)}`;
    return form(SW, SH, inner, { rx: 12, rand: 12, id: 'st' + seedOf(a + (b || '')) });
  },
  // ANTI VIOLA / ANTI VIOLETT: Wort immer durchgestrichen
  antiviola: ({ unter = 'WIEN WEST · SEIT 1899', wort = 'VIOLA' }) => {
    const inner = `<rect width="${SW}" height="${SH}" fill="${CREME}"/>
      <rect x="40" y="40" width="${SW - 80}" height="${SH - 80}" fill="none" stroke="${K}" stroke-width="8" stroke-dasharray="30 14"/>
      ${txt('ANTI', SW / 2, 205, 150, 600, G, { font: 'stencil' })}
      ${txt(wort, SW / 2, 410, 210, 760, V, { font: 'stencil' })}
      <path d="M100 400 L800 250" stroke="${G}" stroke-width="32" stroke-linecap="square"/>
      ${txt(unter, SW / 2, 492, 44, 640, K, { font: 'stencil' })}
      ${blauRot(40, 520, SW - 80, 24)}`;
    return form(SW, SH, inner, { rx: 12, rand: 12, id: 'av' + seedOf(wort) });
  },
  // Wien-Wahrzeichen (eigene Zeichnung) mit Text
  stadt: ({ a, b, mark = 'dom' }) => {
    const zeichen = mark === 'dom' ? dom(450, 40, 1.0) : mark === 'rad' ? riesenrad(450, 175, 120) : `${dom(250, 70, 0.8)}${riesenrad(640, 190, 100)}`;
    const inner = `<rect width="${SW}" height="${SH}" fill="${G}"/>${zeichen}
      <rect x="0" y="352" width="${SW}" height="200" fill="${K}"/>
      ${txt(a, SW / 2, 470, 110, 800, W, { font: 'block' })}
      ${b ? txt(b, SW / 2, 532, 42, 760, W, { font: 'stencil' }) : ''}
      ${blauRot(0, 552, SW, 26)}`;
    return form(SW, SH, inner, { id: 'sd' + seedOf(a + mark) });
  },
  // Flache Figur links, Schrift rechts
  figur: ({ a, b }) => {
    const st = `stroke="${K}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;
    const person = `
      <path d="M120 720 C120 560 190 510 320 505 C450 510 520 560 520 720 Z" fill="${GD}" ${st}/>
      <path d="M262 505 L320 560 L378 505" fill="none" ${st}/>
      <!-- Arm zeigt nach vorne -->
      <path d="M420 560 C470 590 470 640 400 660 L330 668" fill="${GD}" ${st}/>
      <path d="M300 640 h70 a22 22 0 0 1 0 44 h-70 z" fill="${SKIN}" ${st}/>
      <path d="M232 662 h76 a12 12 0 0 1 0 22 h-76 a11 11 0 0 1 0-22z" fill="${SKIN}" ${st}/>
      <!-- Kopf -->
      <rect x="270" y="440" width="100" height="80" fill="${SKIN}" ${st}/>
      <ellipse cx="320" cy="380" rx="92" ry="104" fill="${SKIN}" ${st}/>
      <!-- Tuch -->
      <path d="M228 392 C260 410 380 410 412 392 L404 470 C370 500 270 500 236 470 Z" fill="${G}" ${st}/>
      <path d="M250 430 C290 445 350 445 390 430" stroke="${GD}" stroke-width="5" fill="none"/>
      <!-- Augen -->
      <path d="M262 352 l40 8 M378 352 l-40 8" stroke="${K}" stroke-width="9" stroke-linecap="round"/>
      <circle cx="286" cy="374" r="8" fill="${K}"/><circle cx="354" cy="374" r="8" fill="${K}"/>
      <!-- Kappe -->
      <path d="M226 340 C224 250 416 250 414 340 Z" fill="${G}" ${st}/>
      <path d="M214 338 H470 C470 360 440 366 410 362 H214 Z" fill="${GD}" ${st}/>`;
    const inner = `<rect width="${SW}" height="${SH}" fill="${G}"/>
      <path d="M0 60 L250 200 L500 60 V140 L250 280 L0 140 Z" fill="${W}"/>
      <g transform="translate(-70 -120) scale(1)">${person}</g>
      ${txt(a, 660, 330, 190, 420, W, { font: 'graffiti', stroke: K, sw: 12 })}
      ${b ? txt(b, 660, 420, 52, 400, W, { font: 'marker', stroke: K, sw: 6 }) : ''}
      ${blauRot(0, 556, SW, 30)}`;
    return form(SW, SH, inner, { id: 'fg' + seedOf(a + (b || '')) });
  },
  // Antiviola-Schwein: violettes Schwein, durchgestrichen
  schwein: () => {
    const cx = 450, cy = 300;
    const st = `stroke="${K}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"`;
    const pig = `
      <path d="M${cx - 140} ${cy - 70} L${cx - 165} ${cy - 205} L${cx - 50} ${cy - 140} Z" fill="${V}" ${st}/>
      <path d="M${cx + 140} ${cy - 70} L${cx + 165} ${cy - 205} L${cx + 50} ${cy - 140} Z" fill="${V}" ${st}/>
      <ellipse cx="${cx}" cy="${cy}" rx="170" ry="155" fill="${V}" ${st}/>
      <ellipse cx="${cx - 60}" cy="${cy - 40}" rx="20" ry="24" fill="${W}" ${st}/><circle cx="${cx - 56}" cy="${cy - 34}" r="9" fill="${K}"/>
      <ellipse cx="${cx + 60}" cy="${cy - 40}" rx="20" ry="24" fill="${W}" ${st}/><circle cx="${cx + 56}" cy="${cy - 34}" r="9" fill="${K}"/>
      <ellipse cx="${cx}" cy="${cy + 50}" rx="72" ry="50" fill="#8B5BB5" ${st}/>
      <ellipse cx="${cx - 24}" cy="${cy + 50}" rx="11" ry="18" fill="${K}"/><ellipse cx="${cx + 24}" cy="${cy + 50}" rx="11" ry="18" fill="${K}"/>`;
    const inner = `<rect width="${SW}" height="${SH}" fill="${CREME}"/>
      <rect x="40" y="40" width="${SW - 80}" height="${SH - 80}" fill="none" stroke="${K}" stroke-width="6"/>
      ${txt('WIEN WEST', SW / 2, 118, 64, 520, K, { font: 'stencil' })}
      <g transform="translate(${cx} ${cy + 20}) scale(.68) translate(${-cx} ${-cy})">${pig}</g>
      <path d="M300 450 L600 160" stroke="${CREME}" stroke-width="52" stroke-linecap="round"/>
      <path d="M300 450 L600 160" stroke="${G}" stroke-width="32" stroke-linecap="round"/>
      ${txt('ANTIVIOLA', SW / 2, 540, 74, 600, K, { font: 'stencil' })}
      ${blauRot(40, 552, SW - 80, 8)}`;
    return form(SW, SH, inner, { rx: 12, rand: 12, id: 'pig' });
  },
  pack: ({ a, n }) => {
    const mini = (x, y, r, fill, label, font) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-130" y="-70" width="260" height="140" rx="10" fill="${W}" stroke="#0003" stroke-width="2"/><rect x="-120" y="-60" width="240" height="120" rx="4" fill="${fill}"/>${txt(label, 0, 20, 54, 210, W, { font })}</g>`;
    const inner = `<rect width="${SW}" height="${SH}" fill="${CREME}"/>
      ${mini(230, 160, -8, G, 'WIEN WEST', 'block')}${mini(670, 170, 8, V, 'ANTI VIOLA', 'stencil')}<path d="M560 200 L780 150" stroke="${G}" stroke-width="12"/>
      ${mini(220, 400, 6, K, 'A.C.A.B.', 'stencil')}${mini(680, 410, -6, GD, '1140', 'block')}
      <circle cx="450" cy="285" r="100" fill="${K}"/>${txt(String(n), 450, 322, 110, 150, W, { font: 'block' })}
      ${txt(a, 450, 560, 44, 600, K, { font: 'block' })}`;
    return form(SW, SH, inner, { id: 'p' + n, gr: 0 });
  },
  mystery: ({ n }) => {
    const inner = `<rect width="${SW}" height="${SH}" fill="${K}"/>${txt('?', SW / 2, 380, 320, 240, G, { font: 'block' })}${txt(`${n} ÜBERRASCHUNGEN`, SW / 2, 500, 50, 600, W, { font: 'block' })}`;
    return form(SW, SH, inner, { id: 'm', gr: 0 });
  },
};

// ---------- Produkte (30 Motive + 6 Packs) ----------
// [slug, name, vorlage, daten, kategorie, beschreibung, bestseller]
const P = [
  // ANTI VIOLA & DERBY
  ['anti-viola', 'Anti Viola', 'antiviola', {}, 'derby', 'Schablonen-Look, Viola durchgestrichen. Der Klassiker vor jedem Derby.', true],
  ['anti-violett', 'Anti Violett', 'antiviola', { wort: 'VIOLETT' }, 'derby', 'Schablonen-Look, Violett durchgestrichen.', true],
  ['wien-gehoert-uns', 'Wien gehört uns!', 'block', { zeilen: ['WIEN', 'GEHÖRT', 'UNS!'] }, 'derby', 'Drei Zeilen, drei Streifen, eine Ansage an die andere Seite der Stadt.', true],
  ['wien-gehoert-uns-schal', 'Wien gehört uns! – Schal', 'schal', { zeilen: ['WIEN', 'GEHÖRT UNS!'] }, 'derby', 'Wien gehört uns! in Strick-Optik mit blau-roten Randstreifen.', false],
  ['derbysieger-schal', 'Derbysieger – Schal', 'schal', { zeilen: ['DERBYSIEGER'] }, 'derby', 'Strick-Optik wie der Schal im Kasten – für den Montag nach dem Derby.', true],
  ['wien-gruen-weiss', 'Wien ist grün & weiß!', 'figur', { a: 'WIEN', b: 'ist grün & weiß!' }, 'derby', 'Kappe auf, Tuch vorm Gesicht, Finger nach vorn: Wien ist grün & weiß!', true],
  ['acab', 'A.C.A.B.', 'stencil', { a: 'A.C.A.B.', b: 'WIEN WEST', grund: K }, 'derby', 'Schablone auf Schwarz. Der Klassiker an jedem Geländer.', true],
  // FORZA RAPID / RAPID WIEN
  ['forza-rapid-schal', 'Forza Rapid – Schal', 'schal', { zeilen: ['FORZA RAPID'] }, 'forza', 'Der Schlachtruf in Strick-Optik.', true],
  ['forza-rapid-block', 'Forza Rapid', 'block', { zeilen: ['FORZA', 'RAPID'] }, 'forza', 'Fette Block-Buchstaben auf grünen Streifen – schlicht und laut.', true],
  ['forza-rapid-spray', 'Forza Rapid – Sprühlack', 'spray', { a: 'Forza', b: 'Rapid Wien', oben: G }, 'forza', 'Sprühlack-Schrift mit Farbnasen: Forza, Rapid Wien.', false],
  ['rapid-wien-schal', 'Rapid Wien – Schal', 'schal', { zeilen: ['RAPID WIEN'] }, 'forza', 'Rapid Wien in Strick-Optik, wie der Schal im Kasten.', true],
  ['rapid-wien-fan-szene', 'Rapid Wien Fan Szene', 'block', { zeilen: ['RAPID WIEN', 'FAN SZENE'], farben: [G, K] }, 'forza', 'Rapid Wien Fan Szene auf grün-schwarzen Block-Streifen.', true],
  ['ynwa', 'You’ll never walk alone', 'streifen', { a: 'YOU’LL NEVER', b: 'WALK ALONE' }, 'forza', 'Streifen-Look mit grün-blau-roten Linien, wie man ihn vom Geländer kennt.', true],
  ['scr-1899', 'SCR 1899', 'block', { zeilen: ['SCR', '1899'], farben: [K, G] }, 'forza', 'Drei Buchstaben, eine Jahreszahl. Jeder im Block weiß Bescheid.', true],
  ['antiviola-schwein', 'Antiviola – Schwein', 'schwein', {}, 'derby', 'Violettes Schwein, grün durchgestrichen. Antiviola im alten Siebdruck-Look.', true],
  // WIEN WEST & HÜTTELDORF
  ['wien-west-huetteldorf', 'Wien West Hütteldorf', 'block', { zeilen: ['WIEN', 'WEST', 'HÜTTELDORF'] }, 'wienwest', 'Wien West Hütteldorf – drei Zeilen auf Block-Streifen mit Blau-Rot-Band.', true],
  ['wien-west-huetteldorf-schal', 'Wien West Hütteldorf – Schal', 'schal', { zeilen: ['WIEN WEST', 'HÜTTELDORF'] }, 'wienwest', 'Wien West Hütteldorf in Strick-Optik.', true],
  ['wien-west-schal', 'Wien West – Schal', 'schal', { zeilen: ['WIEN WEST'] }, 'wienwest', 'Unser Name in Strick-Optik – Grün, Weiß, Blau-Rot.', true],
  ['wien-west-block', 'Wien West 1140', 'block', { zeilen: ['WIEN', 'WEST', '1140'] }, 'wienwest', 'Block-Streifen mit Postleitzahl.', true],
  ['1140-huetteldorf', '1140 Hütteldorf', 'block', { zeilen: ['1140', 'HÜTTELDORF'], farben: [G, K] }, 'wienwest', 'Grün und Schwarz, zwei Streifen, eine Postleitzahl.', true],
  ['1140-huetteldorf-schal', '1140 Hütteldorf – Schal', 'schal', { zeilen: ['1140', 'HÜTTELDORF'] }, 'wienwest', '1140 Hütteldorf in Strick-Optik.', false],
  ['weststadion', 'Weststadion', 'streifen', { a: 'WEST', b: 'STADION' }, 'wienwest', 'Für das Wohnzimmer in Hütteldorf. Streifen-Look mit grün-blau-roten Linien.', true],
  ['block-west', 'Block West', 'streifen', { a: 'BLOCK', b: 'WEST' }, 'wienwest', 'Block West im Streifen-Look.', true],
  ['wien-west-steffl', 'Wien West – Stephansdom', 'stadt', { a: 'WIEN WEST', b: 'HÜTTELDORF', mark: 'dom' }, 'wienwest', 'Der Steffl als eigene Zeichnung, darunter Wien West Hütteldorf.', false],
  ['wien-ein-leben-lang', 'Wien – ein Leben lang', 'spray', { a: 'WIEN', b: 'ein Leben lang', oben: G }, 'wienwest', 'Sprühlack-Schrift mit Farbnasen: Wien, ein Leben lang.', true],
  ['wien-meine-heimat', 'Wien – meine Heimat. Meine Liebe.', 'spray', { a: 'WIEN', b: 'meine Heimat. meine Liebe.', oben: G }, 'wienwest', 'Grün-weiß geteilt, Sprühlack-Schrift.', true],
  // KURVE & AUSWÄRTS
  ['wien-nuernberg-schal', 'Wien – Nürnberg', 'schal2', { zeilen: ['WIEN', 'NÜRNBERG'] }, 'kurve', 'Halb grün-weiß, halb schwarz-rot – für die Fanfreundschaft mit Franken.', true],
  ['auswaerts', 'Auswärts immer dabei', 'stencil', { a: 'AUSWÄRTS', b: 'IMMER DABEI' }, 'kurve', 'Schablone in Grün – für Raststation, Bahnhof und Gästesektor.', true],
  ['gegen-modernen-fussball', 'Gegen modernen Fußball', 'stencil', { a: 'GEGEN', b: 'MODERNEN FUSSBALL', grund: K }, 'kurve', 'Schablone auf Schwarz. Stehplätze statt VIP-Logen.', true],
  ['figur-wien-west', 'Wien West – Figur', 'figur', { a: 'WEST', b: 'Wien West Hütteldorf' }, 'kurve', 'Kappe auf, Tuch vorm Gesicht: aus dem Westen, für immer.', false],
  // PACKS
  ['starter-3er', '3er Starter-Pack', 'pack', { a: 'STARTER-PACK', n: 3 }, 'packs', 'Die drei Topseller: Anti Viola, Wien West Hütteldorf, A.C.A.B.', false],
  ['topseller-5er', '5er Topseller-Pack', 'pack', { a: 'TOPSELLER-PACK', n: 5 }, 'packs', 'Fünf Lieblinge aus dem Block in einem Kuvert.', true],
  ['mix-10er', '10er Mix-Pack', 'pack', { a: 'MIX · GRATIS VERSAND', n: 10 }, 'packs', 'Zehn verschiedene Motive für die nächste Auswärtsfahrt. Versand gratis.', true],
  ['kurve-25er', '25er Kurven-Pack', 'pack', { a: 'KURVEN-PACK', n: 25 }, 'packs', 'Für Fanclubs, Stammtische und alle, die auf dem Weg ins Weststadion mehr als einen Laternenmast bekleben.', true],
  ['block-50er', '50er Block-Pack', 'pack', { a: 'BLOCK-PACK', n: 50 }, 'packs', '50 Sticker, alle Motive gemischt. Bester Stückpreis – zum Aufteilen in der Gruppe.', false],
  ['mystery-15er', 'Mystery-Pack (15 Stück)', 'mystery', { n: 15 }, 'packs', '15 Sticker, zufällig gezogen. Mit Sondermotiven, die es einzeln nicht gibt.', false],
];

const PACK = { 'starter-3er': [7.9, 8.7, 3], 'topseller-5er': [12.9, 14.5, 5], 'mix-10er': [24.9, 29, 10], 'kurve-25er': [49, 72.5, 25], 'block-50er': [89, 145, 50], 'mystery-15er': [34.9, 43.5, 15] };
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const writeMd = process.argv.includes('--md');
let i = 0;
for (const [slug, name, tpl, data, kategorie, kurz, bestseller] of P) {
  i++;
  SEED = seedOf(slug);
  const inner = await T[tpl](data);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" role="img" aria-label="${esc(name)}">${inner}</svg>`;
  fs.writeFileSync(path.join(OUT_IMG, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg), { density: 200 }).resize(1200).png({ compressionLevel: 9 }).toFile(path.join(OUT_IMG, `${slug}.png`));

  if (!writeMd) continue;
  const isPack = kategorie === 'packs';
  const [preis, wert, stueck] = isPack ? PACK[slug] : [2.9, undefined, 1];
  const format = isPack ? 'je ca. 9 × 6 cm' : 'ca. 9 × 6 cm';
  fs.writeFileSync(path.join(OUT_MD, `${slug}.md`), `---
name: ${JSON.stringify(name)}
kurz: ${JSON.stringify(kurz)}
typ: ${isPack ? 'pack' : 'einzel'}
kategorie: ${kategorie}
preis: ${preis}
${wert ? `wertEinzeln: ${wert}\n` : ''}stueck: ${stueck}
format: ${JSON.stringify(format)}
bild: /sticker/${slug}.svg
bildPng: /sticker/${slug}.png
bestseller: ${bestseller}
verfuegbar: true
sku: WW-${String(i).padStart(3, '0')}
reihenfolge: ${i}
shopifyVariantId: ""
seo:
  title: ${JSON.stringify((isPack ? `${name} – Rapid Sticker Set kaufen | Wien West` : `${name} Sticker kaufen – Rapid Aufkleber | Wien West`).slice(0, 70))}
  description: ${JSON.stringify(`${name}: ${kurz} ${isPack ? '' : '9 × 6 cm, wetterfest, 2,90 €. '}Gratis Versand ab 20 €.`.replace(/\s+/g, ' ').slice(0, 158))}
  noindex: false
---
${kurz}

${isPack ? `Im ${name} stecken ${stueck} Rapid-Fan-Sticker im Kurven-Look, gemischt aus allen Kategorien – ideal zum Aufteilen im Fanclub oder auf der Auswärtsfahrt.` : `Der Sticker „${name}“ ist ein inoffizieller Rapid-Fan-Aufkleber aus Wien West – gedruckt im flachen Kurven-Look, ohne Vereinswappen. Er hält auf Laptop, Trinkflasche, Spind, Auto und Laternenmast.`}

**Material:** wetterfestes Vinyl mit matter Schutzlaminierung, wasserfest und UV-beständig.
**Format:** ${format}.
`);
}
console.log(`${P.length} Produkte erzeugt${writeMd ? ' (inkl. Markdown)' : ''}.`);
