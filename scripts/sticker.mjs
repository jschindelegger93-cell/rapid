// Erzeugt 30 Sticker-Designs im Kurven-Look + 6 Packs (Markdown für Astro/Sveltia) und die Grafiken (SVG + PNG).
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
async function maschen(str, cols, rows, fontKey = 'pixel', fill = 0.62) {
  const font = F[fontKey];
  const H = rows * 10, Wd = cols * 10;
  let size = H * fill;
  let w = font.getAdvanceWidth(str, size);
  if (w > Wd * 0.92) { size *= (Wd * 0.92) / w; w = font.getAdvanceWidth(str, size); }
  const p = font.getPath(str, (Wd - w) / 2, H / 2 + size * 0.37, size).toPathData(2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wd}" height="${H}"><rect width="100%" height="100%" fill="#000"/><path d="${p}" fill="#fff"/></svg>`;
  const { data } = await sharp(Buffer.from(svg)).resize(cols, rows, { kernel: 'lanczos3' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  return Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => data[r * cols + c] > 128));
}
/** Zeichnet Gitter als Strickmaschen (V-Form) */
function strick(grid, x0, y0, cw, ch, farbeAn, farbeAus, farbeAt) {
  let out = '';
  grid.forEach((row, r) => row.forEach((on, c) => {
    const col = typeof farbeAt === 'function' ? farbeAt(r, c, on) : on ? farbeAn : farbeAus;
    const x = x0 + c * cw, y = y0 + r * ch;
    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cw + 0.6}" height="${ch + 0.6}" fill="${col}"/>`;
    out += `<path d="M${(x + cw * 0.08).toFixed(1)} ${(y + ch * 0.15).toFixed(1)}Q${(x + cw * 0.28).toFixed(1)} ${(y + ch * 0.95).toFixed(1)} ${(x + cw * 0.5).toFixed(1)} ${(y + ch * 0.9).toFixed(1)}M${(x + cw * 0.92).toFixed(1)} ${(y + ch * 0.15).toFixed(1)}Q${(x + cw * 0.72).toFixed(1)} ${(y + ch * 0.95).toFixed(1)} ${(x + cw * 0.5).toFixed(1)} ${(y + ch * 0.9).toFixed(1)}" stroke="#000" stroke-opacity=".18" stroke-width="${(cw * 0.12).toFixed(1)}" fill="none"/>`;
  }));
  return out;
}

// ---------- Vorlagen ----------
// Jede Vorlage liefert { w, h, svg } (async erlaubt)
const T = {
  // Strick-Schal quer: Streifen oben/unten, Strick-Schrift
  schal: async ({ a, grund = G, schrift = W, rand = W }) => {
    const cols = 120, rows = 28, cw = 8, ch = 8;
    const grid = await maschen(a, cols, rows - 6, 'anton', 0.8);
    const full = [
      ...Array.from({ length: 3 }, () => Array(cols).fill('r')),
      ...grid.map((row) => row.map((v) => (v ? 'a' : 'g'))),
      ...Array.from({ length: 3 }, () => Array(cols).fill('r')),
    ];
    const farbe = { r: rand, a: schrift, g: grund };
    const stripe = (r) => (r === 1 || r === rows - 2 ? grund : null);
    const inner = strick(full, 0, 0, cw, ch, null, null, (r, c, v) => stripe(r) || farbe[full[r][c]]);
    return { w: cols * cw, h: rows * ch, svg: form(cols * cw, rows * ch, inner, { rx: 10, rand: 10, id: 's' + seedOf(a), gr: 0.6 }) };
  },
  // Strick-Schal zweifarbig (Freundschaft)
  schal2: async ({ a }) => {
    const cols = 120, rows = 28, cw = 8, ch = 8;
    const grid = await maschen(a, cols, rows - 6, 'anton', 0.8);
    const full = [...Array.from({ length: 3 }, () => Array(cols).fill(false)), ...grid, ...Array.from({ length: 3 }, () => Array(cols).fill(false))];
    const inner = strick(full, 0, 0, cw, ch, null, null, (r, c, v) => {
      const links = c < cols / 2;
      if (r < 3 || r >= rows - 3) return (r === 1 || r === rows - 2) ? (links ? G : R) : W;
      return v ? W : links ? G : K;
    });
    return { w: cols * cw, h: rows * ch, svg: form(cols * cw, rows * ch, inner, { rx: 10, rand: 10, id: 'f', gr: 0.6 }) };
  },
  // Block-Streifen: jede Zeile auf eigenem Streifen
  block: ({ zeilen, farben = [G, GD] }) => {
    const w = 640, lh = 132, pad = 24, h = zeilen.length * lh + pad * 2;
    let inner = `<rect width="${w}" height="${h}" fill="${W}"/>`;
    zeilen.forEach((z, i) => {
      const y = pad + i * lh;
      inner += `<rect x="0" y="${y}" width="${w}" height="${lh - 8}" fill="${farben[i % farben.length]}"/>`;
      inner += txt(z, w / 2, y + lh * 0.72, 96, w - 80, W, { font: 'block', shadow: [6, 6, K] });
    });
    return { w, h, svg: form(w, h, inner, { rx: 16, rand: 12, id: 'b' + seedOf(zeilen.join()) }) };
  },
  // Sprühlack: Fläche geteilt, Graffiti-Schrift, Farbnasen
  spray: ({ a, b, oben = G, unten = CREME, font = 'graffiti', schrift = W }) => {
    const w = 900, h = 600;
    SEED = seedOf(a);
    let drips = '';
    for (let x = 30; x < w; x += 30 + rnd() * 50) { const l = 20 + rnd() * 70; drips += `<rect x="${x.toFixed(0)}" y="320" width="${(8 + rnd() * 10).toFixed(0)}" height="${l.toFixed(0)}" rx="6" fill="${oben}"/>`; }
    const inner = `<rect width="${w}" height="${h}" fill="${unten}"/><rect width="${w}" height="330" fill="${oben}"/>${drips}
      ${txt(a, w / 2, 300, 230, 800, schrift, { font, stroke: oben === G ? GD : K, sw: 10 })}
      ${b ? txt(b, w / 2, 500, 84, 780, oben === G ? G : K, { font: 'marker' }) : ''}`;
    return { w, h, svg: form(w, h, inner, { id: 'sp' + seedOf(a) }) };
  },
  // Lang hochkant: weiß, doppelte Randlinien, Text quer
  lang: ({ a, b, grund = W, schrift = G }) => {
    const w = 300, h = 940;
    const linien = `<rect x="26" y="26" width="10" height="${h - 52}" fill="${G}"/><rect x="44" y="26" width="4" height="${h - 52}" fill="${R}"/><rect x="${w - 36}" y="26" width="10" height="${h - 52}" fill="${G}"/><rect x="${w - 48}" y="26" width="4" height="${h - 52}" fill="${R}"/>`;
    const inner = `<rect width="${w}" height="${h}" fill="${grund}"/>${linien}
      <g transform="rotate(90 ${w / 2} ${h / 2})">
        ${txt(a, w / 2, h / 2 + (b ? 4 : 44), 140, 820, schrift, { font: 'block' })}
        ${b ? txt(b, w / 2, h / 2 + 96, 80, 820, K, { font: 'block' }) : ''}
      </g>`;
    return { w, h, svg: form(w, h, inner, { rx: 14, rand: 12, id: 'l' + seedOf(a) }) };
  },
  // Schablone: Stencil-Schrift, optional durchgestrichen
  stencil: ({ a, b, strich = false, grund = G, schrift = W, rahmen = W }) => {
    const w = 900, h = 560;
    const inner = `<rect width="${w}" height="${h}" fill="${grund}"/>
      <rect x="40" y="40" width="${w - 80}" height="${h - 80}" fill="none" stroke="${rahmen}" stroke-width="8" stroke-dasharray="30 14"/>
      ${txt(a, w / 2, 310, 210, 760, schrift, { font: 'stencil' })}
      ${strich ? `<path d="M110 300 L790 170" stroke="${G}" stroke-width="30" stroke-linecap="square"/>` : ''}
      ${b ? txt(b, w / 2, 450, 72, 740, rahmen, { font: 'stencil' }) : ''}`;
    return { w, h, svg: form(w, h, inner, { rx: 12, rand: 12, id: 'st' + seedOf(a) }) };
  },
  // Rundes Abzeichen, schlicht
  rund: ({ a, oben, unten, dunkel = false }) => {
    const w = 600, h = 600, c1 = dunkel ? K : G, c2 = dunkel ? G : W;
    const inner = `<rect width="600" height="600" fill="${c1}"/>
      <circle cx="300" cy="300" r="190" fill="${c2}"/><circle cx="300" cy="300" r="174" fill="${c1}"/>
      <circle cx="300" cy="300" r="268" fill="none" stroke="${c2}" stroke-width="6"/>
      ${arc(oben, 300, 300, 208, 54, W)}${arc(unten, 300, 300, 208, 44, W, true)}
      <circle cx="78" cy="300" r="9" fill="${W}"/><circle cx="522" cy="300" r="9" fill="${W}"/>
      ${txt(a, 300, 352, 150, 280, W, { font: 'block' })}`;
    return { w, h, svg: form(w, h, inner, { rund: true, rand: 14, id: 'r' + seedOf(a + oben) }) };
  },
  // Flache Figur: Kappe, Tuch vorm Gesicht, zeigt nach vorne
  figur: ({ a, b }) => {
    const w = 640, h = 720;
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
    const inner = `<rect width="${w}" height="${h}" fill="${G}"/>
      <path d="M0 110 L320 280 L640 110 V200 L320 370 L0 200 Z" fill="${W}"/>
      <g transform="translate(-30 -110) scale(1.1)">${person}</g>
      <rect x="0" y="560" width="${w}" height="160" fill="${K}" opacity=".0"/>
      <rect x="0" y="560" width="640" height="160" fill="${G}"/>${txt(a, w / 2, 650, 130, 560, W, { font: 'graffiti', stroke: K, sw: 12 })}
      ${b ? txt(b, w / 2, 700, 46, 520, W, { font: 'marker', stroke: K, sw: 6 }) : ''}`;
    return { w, h, svg: form(w, h, inner, { id: 'fg' + seedOf(a) }) };
  },
  // Straßenschild, breit
  schild: ({ nr, a, b }) => {
    const w = 900, h = 300;
    const inner = `<rect width="${w}" height="${h}" fill="${G}"/>
      <rect x="34" y="34" width="${w - 68}" height="${h - 68}" rx="8" fill="none" stroke="${W}" stroke-width="6"/>
      ${txt(nr, 130, 190, 110, 150, W)}<rect x="228" y="62" width="5" height="176" fill="${W}"/>
      ${txt(a, 545, 172, 110, 560, W)}${txt(b, 545, 228, 40, 560, W, { font: 'anton' })}`;
    return { w, h, svg: form(w, h, inner, { rx: 22, rand: 14, id: 'sch', gr: 0.7 }) };
  },
  pack: ({ a, n }) => {
    const w = 600, h = 600;
    const mini = (x, y, r, fill, label, font) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-120" y="-60" width="240" height="120" rx="10" fill="${W}" stroke="#0003" stroke-width="2"/><rect x="-110" y="-50" width="220" height="100" rx="4" fill="${fill}"/>${txt(label, 0, 18, 50, 190, W, { font })}</g>`;
    const inner = `<rect width="600" height="600" fill="${CREME}"/>
      ${mini(200, 170, -10, G, 'WIEN WEST', 'block')}${mini(410, 190, 9, V, 'ANTI VIOLA', 'stencil')}
      ${mini(190, 400, 7, K, 'FORZA', 'graffiti')}${mini(410, 410, -7, GD, '1140', 'block')}
      <circle cx="300" cy="300" r="90" fill="${K}"/>${txt(String(n), 300, 334, 100, 130, W, { font: 'block' })}
      ${txt(a, 300, 560, 40, 420, K, { font: 'block' })}`;
    return { w, h, svg: form(w, h, inner, { rund: true, id: 'p' + n, gr: 0 }) };
  },
  mystery: ({ n }) => {
    const inner = `<rect width="600" height="600" fill="${K}"/>${txt('?', 300, 380, 320, 240, G, { font: 'block' })}${txt(`${n} ÜBERRASCHUNGEN`, 300, 480, 44, 380, W, { font: 'block' })}`;
    return { w: 600, h: 600, svg: form(600, 600, inner, { rund: true, id: 'm', gr: 0 }) };
  },
};

// ---------- Produkte ----------
// [slug, name, vorlage, daten, typ, kategorie, beschreibung, bestseller]
const P = [
  // ANTI VIOLA & DERBY
  ['anti-viola', 'Anti Viola', 'stencil', { a: 'VIOLA', b: 'ANTI · ANTI · ANTI', strich: true, grund: CREME, schrift: V, rahmen: K }, 'einzel', 'derby', 'Schablonen-Look, Violett durchgestrichen. Der Klassiker vor jedem Derby.', true],
  ['antiviola-rund', 'Antiviola – Rund', 'rund', { a: 'ANTI', oben: 'GEGEN VIOLETT', unten: 'WIEN WEST', dunkel: true }, 'einzel', 'derby', 'Rundes Abzeichen in Schwarz-Grün. Passt auf jeden Laternenmast.', true],
  ['wien-gehoert-uns', 'Wien gehört uns', 'block', { zeilen: ['WIEN', 'GEHÖRT', 'UNS!'] }, 'einzel', 'derby', 'Drei Zeilen, drei Streifen, eine Ansage an die andere Seite der Stadt.', true],
  ['zehnter-durchfahrt', '10. Bezirk? Nur Durchfahrt', 'stencil', { a: '10. BEZIRK?', b: 'NUR DURCHFAHRT' }, 'einzel', 'derby', 'Derby-Schmäh für alle, die in Favoriten höchstens umsteigen.', true],
  ['derbysieger-schal', 'Derbysieger – Schal', 'schal', { a: 'DERBYSIEGER' }, 'breit', 'derby', 'Strick-Optik wie der Schal im Kasten – für den Montag nach dem Derby.', true],
  ['violett-nein-danke', 'Violett? Nein danke', 'spray', { a: 'Violett?', b: 'nein danke.', oben: V, unten: CREME }, 'einzel', 'derby', 'Sprühlack-Optik mit Farbnasen. Freundlich, aber bestimmt.', false],
  ['wien-gruen-weiss', 'Wien ist grün-weiß', 'figur', { a: 'WIEN', b: 'ist grün-weiß!' }, 'einzel', 'derby', 'Kappe auf, Tuch vorm Gesicht, Finger nach vorn: Wien ist grün-weiß.', true],
  // FORZA RAPID
  ['forza-rapid-schal', 'Forza Rapid – Schal', 'schal', { a: 'FORZA RAPID' }, 'breit', 'forza', 'Der Schlachtruf in Strick-Optik, Breitformat.', true],
  ['forza-rapid-block', 'Forza Rapid', 'block', { zeilen: ['FORZA', 'RAPID'] }, 'einzel', 'forza', 'Fette Block-Buchstaben auf grünen Streifen – schlicht und laut.', true],
  ['scr-1899', 'SCR 1899', 'rund', { a: 'SCR', oben: 'SEIT 1899', unten: 'HÜTTELDORF' }, 'einzel', 'forza', 'Drei Buchstaben, die jeder im Block kennt.', true],
  ['ynwa', 'You’ll never walk alone', 'lang', { a: 'NEVER', b: 'WALK ALONE' }, 'einzel', 'forza', 'Langer Streifen im Kurven-Look – für Geländer, Masten und Türrahmen.', true],
  ['viertelstunde', 'Rapid-Viertelstunde', 'spray', { a: '75.', b: 'Rapid-Viertelstunde', oben: G }, 'einzel', 'forza', 'Ab der 75. wird geklatscht. Sprühlack-Optik in Grün-Weiß.', true],
  ['einmal-rapid-schal', 'Einmal Rapid – Schal', 'schal', { a: 'IMMER RAPID', grund: W, schrift: G, rand: G }, 'breit', 'forza', 'Weißer Strick, grüne Schrift. Man wird nicht Rapidler, man bleibt es.', false],
  ['ein-leben-lang', 'Grün-Weiß ein Leben lang', 'spray', { a: 'Grün-Weiß', b: 'ein Leben lang', oben: G }, 'einzel', 'forza', 'Sprühlack-Schrift mit Farbnasen. Ein Satz ohne Ablaufdatum.', true],
  // WIEN WEST & WESTSTADION
  ['wien-west-schal', 'Wien West – Schal', 'schal', { a: 'WIEN WEST' }, 'breit', 'wienwest', 'Unser Name in Strick-Optik – Grün, Weiß, ohne Schnickschnack.', true],
  ['wien-west-block', 'Wien West', 'block', { zeilen: ['WIEN', 'WEST', '1140'] }, 'einzel', 'wienwest', 'Block-Streifen mit Postleitzahl. Für alle, die im Westen daheim sind.', true],
  ['1140-huetteldorf', '1140 Hütteldorf', 'block', { zeilen: ['1140', 'HÜTTELDORF'], farben: [G, K] }, 'einzel', 'wienwest', 'Grün und Schwarz, zwei Streifen, eine Postleitzahl.', true],
  ['weststadion-lang', 'Weststadion', 'lang', { a: 'WEST', b: 'STADION' }, 'einzel', 'wienwest', 'Langer Streifen für das Wohnzimmer in Hütteldorf.', true],
  ['block-west-lang', 'Block West', 'lang', { a: 'BLOCK', b: 'WEST' }, 'einzel', 'wienwest', 'Der lange Streifen mit doppelter Randlinie – wie man ihn vom Geländer kennt.', true],
  ['huetteldorf-schild', 'Hütteldorf – Straßenschild', 'schild', { nr: '14.', a: 'HÜTTELDORF', b: 'WIEN WEST · SEIT 1899' }, 'breit', 'wienwest', 'Im Look der Wiener Straßenschilder – nur in Grün.', true],
  ['meine-heimat', 'Wien West – meine Heimat', 'spray', { a: 'Wien West', b: 'meine Heimat', oben: G }, 'einzel', 'wienwest', 'Grün-weiß geteilt, Sprühlack-Schrift. Für die Heimat im Westen.', false],
  ['st-hanappi', 'St. Hanappi', 'rund', { a: 'ST.', oben: 'SANKT HANAPPI', unten: 'FÜR IMMER', dunkel: true }, 'einzel', 'wienwest', 'Für alle, die noch im alten Hanappi gestanden sind.', false],
  ['pfarrwiese', 'Pfarrwiese 1912', 'rund', { a: '1912', oben: 'PFARRWIESE', unten: 'HÜTTELDORF' }, 'einzel', 'wienwest', 'Hommage an die legendäre Heimstätte von 1912 bis 1977.', false],
  // KURVE & AUSWÄRTS
  ['auswaerts-lang', 'Auswärts immer dabei', 'lang', { a: 'AUSWÄRTS', b: 'IMMER DABEI' }, 'einzel', 'kurve', 'Langer Streifen für Raststation, Bahnhof und Gästesektor.', true],
  ['gegen-modernen-fussball', 'Gegen modernen Fußball', 'stencil', { a: 'GEGEN', b: 'MODERNEN FUSSBALL', grund: K }, 'einzel', 'kurve', 'Schablone auf Schwarz. Stehplätze statt VIP-Logen.', true],
  ['wien-nuernberg-schal', 'Wien – Nürnberg', 'schal2', { a: 'WIEN NÜRNBERG' }, 'breit', 'kurve', 'Halb grün-weiß, halb schwarz-rot – für die Fanfreundschaft mit Franken.', true],
  ['kurve-statt-couch', 'Kurve statt Couch', 'block', { zeilen: ['KURVE', 'STATT', 'COUCH'], farben: [K, G] }, 'einzel', 'kurve', 'Für alle, die Fußball nicht im Fernsehen schauen.', false],
  ['gruenes-blut', 'Grünes Blut', 'spray', { a: 'Grünes Blut', b: 'weißes Herz', oben: G }, 'einzel', 'kurve', 'Zwei Zeilen Sprühlack, die erklären, warum am Spieltag nichts anderes zählt.', true],
  ['aus-dem-westen', 'Aus dem Westen', 'figur', { a: 'WESTEN', b: 'aus dem Westen. Für immer.' }, 'einzel', 'kurve', 'Flache Figur mit Kappe und Tuch – für alle, die im Westen daheim sind.', false],
  ['32-titel', '32 Titel', 'rund', { a: '32', oben: 'REKORDMEISTER', unten: 'WIEN WEST' }, 'einzel', 'kurve', 'Für alle, die die Meistertitel auswendig aufzählen können.', false],
  // PACKS
  ['starter-3er', '3er Starter-Pack', 'pack', { a: 'STARTER-PACK', n: 3 }, 'pack', 'packs', 'Die drei Topseller: Anti Viola, Forza Rapid, Wien West.', false],
  ['topseller-5er', '5er Topseller-Pack', 'pack', { a: 'TOPSELLER-PACK', n: 5 }, 'pack', 'packs', 'Fünf Lieblinge aus dem Block in einem Kuvert.', true],
  ['mix-10er', '10er Mix-Pack', 'pack', { a: 'MIX · GRATIS VERSAND', n: 10 }, 'pack', 'packs', 'Zehn verschiedene Motive für die nächste Auswärtsfahrt. Mit 15 € genau an der Gratis-Versand-Grenze.', true],
  ['kurve-25er', '25er Kurven-Pack', 'pack', { a: 'KURVEN-PACK', n: 25 }, 'pack', 'packs', 'Für Fanclubs, Stammtische und alle, die auf dem Weg ins Weststadion mehr als einen Laternenmast bekleben.', true],
  ['block-50er', '50er Block-Pack', 'pack', { a: 'BLOCK-PACK', n: 50 }, 'pack', 'packs', '50 Sticker, alle Motive gemischt. Bester Stückpreis – zum Aufteilen in der Gruppe.', false],
  ['mystery-15er', 'Mystery-Pack (15 Stück)', 'mystery', { n: 15 }, 'pack', 'packs', '15 Sticker, zufällig gezogen. Mit Sondermotiven, die es einzeln nicht gibt.', false],
];

const PREIS = { einzel: 2.5, breit: 3.9 };
const PACK = { 'starter-3er': [6.9, 7.5, 3], 'topseller-5er': [9.9, 12.5, 5], 'mix-10er': [15, 25, 10], 'kurve-25er': [29, 62.5, 25], 'block-50er': [49, 125, 50], 'mystery-15er': [19, 37.5, 15] };
const formatText = (tpl, typ) =>
  typ === 'pack' ? 'gemischte Formate (ca. 8 cm)'
  : typ === 'breit' ? 'ca. 15 × 5 cm' : tpl === 'lang' ? 'ca. 4 × 13 cm' : tpl === 'rund' ? 'Ø ca. 8 cm' : 'ca. 9 × 6 cm';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const writeMd = process.argv.includes('--md');
let i = 0;
for (const [slug, name, tpl, data, typ, kategorie, kurz, bestseller] of P) {
  i++;
  SEED = seedOf(slug);
  const { w, h, svg: inner } = await T[tpl](data);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(name)}">${inner}</svg>`;
  fs.writeFileSync(path.join(OUT_IMG, `${slug}.svg`), svg);
  const long = Math.max(w, h);
  await sharp(Buffer.from(svg), { density: 200 })
    .resize(w >= h ? Math.round((1200 * w) / long) : null, h > w ? 1200 : null)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_IMG, `${slug}.png`));

  if (!writeMd) continue;
  const isPack = typ === 'pack';
  const [preis, wert, stueck] = isPack ? PACK[slug] : [PREIS[typ], undefined, 1];
  const format = formatText(tpl, typ);
  fs.writeFileSync(path.join(OUT_MD, `${slug}.md`), `---
name: ${JSON.stringify(name)}
kurz: ${JSON.stringify(kurz)}
typ: ${typ}
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
  title: ${JSON.stringify(`${name} – Sticker | Wien West`.slice(0, 70))}
  description: ${JSON.stringify(`${kurz} Wetterfester Vinyl-Sticker, gratis Versand ab 15 €.`.slice(0, 160))}
  noindex: false
---
${kurz}

**Material:** wetterfestes Vinyl mit matter Schutzlaminierung, wasserfest und UV-beständig [PLATZHALTER: mit Druckerei abgleichen].
**Format:** ${format}.
`);
}
console.log(`${P.length} Produkte erzeugt${writeMd ? ' (inkl. Markdown)' : ''}.`);
