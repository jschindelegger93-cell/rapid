// Erzeugt 30 Sticker-Designs im Szene-Stil + 6 Packs (Markdown für Astro/Sveltia) und die Grafiken (SVG + PNG).
// Aufruf: npm run sticker            → nur Grafiken neu
//         npm run sticker -- --md    → zusätzlich Markdown-Dateien (überschreibt!)
import fs from 'node:fs';
import path from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const font = opentype.parse(
  fs.readFileSync(path.join(ROOT, 'node_modules/@fontsource/anton/files/anton-latin-400-normal.woff')).buffer
);
const OUT_IMG = path.join(ROOT, 'public/sticker');
const OUT_MD = path.join(ROOT, 'src/content/sticker');
fs.mkdirSync(OUT_IMG, { recursive: true });
fs.mkdirSync(OUT_MD, { recursive: true });

// Farben
const G = '#2F8F3A'; // Flaggengrün (Szene-Look)
const GD = '#14532D'; // Dunkelgrün
const GL = '#8EE09A'; // Hellgrün
const W = '#FFFFFF';
const K = '#111111';
const V = '#5B2A86'; // Violett (nur Anti-Motive)
const RX = '#D62828'; // Rot für Kreuze
const R = '#C8102E'; // Rot (Freundschaft)
const SKIN = '#E9B590';

// ---------- Helfer ----------
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
const seedOf = (str) => [...str].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 2147483647, 7) || 7;

/** Text als Pfad, zentriert, optional mit Umriss und Kursiv-Schräge */
function txt(str, cx, baseline, size, maxW, fill, o = {}) {
  let s = size;
  const w0 = font.getAdvanceWidth(str, s);
  if (w0 > maxW) s = (s * maxW) / w0;
  const w = font.getAdvanceWidth(str, s);
  const d = font.getPath(str, cx - w / 2, baseline, s).toPathData(2);
  const t = o.skew ? ` transform="translate(${cx} ${baseline}) skewX(${o.skew}) translate(${-cx} ${-baseline})"` : '';
  const outline = o.stroke
    ? `<path d="${d}" fill="${o.stroke}" stroke="${o.stroke}" stroke-width="${o.sw || 10}" stroke-linejoin="round"${t}/>`
    : '';
  return `${outline}<path d="${d}" fill="${fill}"${t}/>`;
}
/** Szene-Schrift: kursiv, dicker Umriss */
const hart = (str, cx, y, size, maxW, fill, stroke = K, sw = 12) => txt(str, cx, y, size, maxW, fill, { stroke, sw, skew: -9 });

/** Text auf Kreisbogen */
function arc(str, cx, cy, r, size, fill, unten = false, spacing = 4) {
  const chars = [...str];
  const ws = chars.map((c) => font.getAdvanceWidth(c, size) + spacing);
  const total = ws.reduce((a, b) => a + b, 0) - spacing;
  let cum = 0;
  return chars
    .map((c, i) => {
      const w = ws[i] - spacing;
      const mid = cum + w / 2;
      cum += ws[i];
      const a = unten ? (total / 2 - mid) / r : (mid - total / 2) / r;
      const p = font.getPath(c, -w / 2, 0, size).toPathData(2);
      const off = unten ? r + size * 0.72 : -r;
      return `<path d="${p}" fill="${fill}" transform="translate(${cx} ${cy}) rotate(${((a * 180) / Math.PI).toFixed(2)}) translate(0 ${off.toFixed(1)})"/>`;
    })
    .join('');
}
function stern(x, y, s, f) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? s * 0.42 : s;
    return `${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<polygon points="${pts}" fill="${f}"/>`;
}

// ---------- Embleme (eigene Zeichen, keine Vereins- oder Stadtwappen) ----------
/** Eigenes Wien-West-Schild: grün/weiß geteilt, "WW" */
function schildWW(cx, cy, s = 1, label = 'WW') {
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M-78 -92h156v70c0 62-36 98-78 120-42-22-78-58-78-120z" fill="${W}" stroke="${K}" stroke-width="10" stroke-linejoin="round"/>
    <clipPath id="sc${cx}${cy}"><path d="M-73 -87h146v65c0 58-33 92-73 113-40-21-73-55-73-113z"/></clipPath>
    <g clip-path="url(#sc${cx}${cy})"><rect x="-80" y="-90" width="80" height="200" fill="${G}"/></g>
    ${txt(label, 0, 30, 92, 130, W, { stroke: K, sw: 9 })}
  </g>`;
}
/** Violette Scheibe mit rotem Kreuz (generisch, kein Logo) */
function keinViolett(cx, cy, r = 80) {
  return `<g transform="translate(${cx} ${cy})">
    <circle r="${r}" fill="${W}" stroke="${K}" stroke-width="8"/>
    <circle r="${r * 0.78}" fill="${V}"/>
    ${txt('V', 0, r * 0.32, r * 0.95, r, W)}
    <path d="M${-r * 0.75} ${-r * 0.75}L${r * 0.75} ${r * 0.75}M${r * 0.75} ${-r * 0.75}L${-r * 0.75} ${r * 0.75}" stroke="${RX}" stroke-width="${r * 0.2}" stroke-linecap="round"/>
  </g>`;
}
/** Splatter-Wolke */
function splatter(cx, cy, rad, seed, farben = [G, K, GD, GL]) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < 46; i++) {
    const a = r() * Math.PI * 2;
    const d = rad * (0.35 + r() * 0.75);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.9;
    const s = 10 + r() * 46 * (1 - d / (rad * 1.2));
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(4, s).toFixed(1)}" fill="${farben[i % farben.length]}"/>`;
    if (i % 3 === 0) {
      const d2 = d + 30 + r() * 50;
      out += `<circle cx="${(cx + Math.cos(a) * d2).toFixed(1)}" cy="${(cy + Math.sin(a) * d2 * 0.9).toFixed(1)}" r="${(3 + r() * 7).toFixed(1)}" fill="${farben[(i + 1) % farben.length]}"/>`;
    }
  }
  return out;
}
/** Eigene Fan-Figur: Haube, Schal vorm Gesicht, Jacke. Varianten: ruhig | faust | schal */
function figur(cx, cy, s = 1, variante = 'ruhig', haube = 'WW') {
  const st = `stroke="${K}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"`;
  const arm = variante === 'faust'
    ? `<path d="M118 120 C150 60 168 -10 160 -70" fill="none" stroke="${K}" stroke-width="58" stroke-linecap="round"/>
       <path d="M118 120 C150 60 168 -10 160 -70" fill="none" stroke="${GD}" stroke-width="44" stroke-linecap="round"/>
       <rect x="128" y="-128" width="66" height="70" rx="22" fill="${SKIN}" ${st}/>
       <path d="M140 -110h42M140 -94h42M140 -78h42" stroke="${K}" stroke-width="4"/>`
    : '';
  const schalHoch = variante === 'schal'
    ? `<path d="M-120 140 L-150 -40" stroke="${K}" stroke-width="54" stroke-linecap="round"/><path d="M-120 140 L-150 -40" stroke="${GD}" stroke-width="40" stroke-linecap="round"/>
       <path d="M120 140 L150 -40" stroke="${K}" stroke-width="54" stroke-linecap="round"/><path d="M120 140 L150 -40" stroke="${GD}" stroke-width="40" stroke-linecap="round"/>
       <rect x="-200" y="-112" width="400" height="58" rx="6" fill="${W}" ${st}/>
       ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${-196 + i * 57}" y="-108" width="28" height="50" fill="${G}"/>`).join('')}
       ${[-170, 170].map((x) => `<circle cx="${x}" cy="-48" r="26" fill="${SKIN}" ${st}/>`).join('')}`
    : '';
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    ${schalHoch}
    <!-- Jacke -->
    <path d="M-150 230 C-150 140 -110 100 -52 92 L52 92 C110 100 150 140 150 230 Z" fill="${GD}" ${st}/>
    <path d="M0 96 V230" stroke="${K}" stroke-width="5"/>
    <path d="M-52 92 C-40 128 40 128 52 92" fill="${G}" ${st}/>
    <path d="M-20 116 v40 M20 116 v40" stroke="${W}" stroke-width="5" stroke-linecap="round"/>
    <rect x="-118" y="168" width="40" height="12" rx="3" fill="${G}"/>
    ${arm}
    <!-- Kopf -->
    <ellipse cx="0" cy="0" rx="64" ry="76" fill="${SKIN}" ${st}/>
    <!-- Haube -->
    <path d="M-68 -6 C-72 -86 72 -86 68 -6 Z" fill="${G}" ${st}/>
    <rect x="-72" y="-26" width="144" height="34" rx="8" fill="${GD}" ${st}/>
    ${haube ? txt(haube, 0, 1, 26, 80, W) : ''}
    <!-- Augen -->
    <path d="M-40 22 l26 6 M40 22 l-26 6" stroke="${K}" stroke-width="7" stroke-linecap="round"/>
    <ellipse cx="-24" cy="36" rx="7" ry="6" fill="${K}"/><ellipse cx="24" cy="36" rx="7" ry="6" fill="${K}"/>
    <!-- Schal vorm Gesicht -->
    <path d="M-66 48 C-40 60 40 60 66 48 L62 96 C30 108 -30 108 -62 96 Z" fill="${W}" ${st}/>
    <clipPath id="fs${cx}${cy}"><path d="M-66 48 C-40 60 40 60 66 48 L62 96 C30 108 -30 108 -62 96 Z"/></clipPath>
    <g clip-path="url(#fs${cx}${cy})">${[-60, -28, 4, 36].map((x) => `<rect x="${x}" y="40" width="16" height="80" fill="${G}"/>`).join('')}</g>
    <path d="M-66 48 C-40 60 40 60 66 48 L62 96 C30 108 -30 108 -62 96 Z" fill="none" ${st}/>
  </g>`;
}
/** Textbalken wie bei Szene-Stickern */
function balkenText(str, cx, cy, w, h, rot = -3, fill = W, color = K) {
  return `<g transform="rotate(${rot} ${cx} ${cy})">
    <rect x="${cx - w / 2 - 8}" y="${cy - h / 2 - 8}" width="${w + 16}" height="${h + 16}" fill="${K}"/>
    <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="${fill}"/>
    ${txt(str, cx, cy + h * 0.3, h * 0.78, w - 28, color)}
  </g>`;
}
/** Stoppuhr 75' */
function uhr(cx, cy, r) {
  return `<g transform="translate(${cx} ${cy})">
    <rect x="-16" y="${-r - 30}" width="32" height="26" rx="6" fill="${K}"/>
    <circle r="${r}" fill="${W}" stroke="${K}" stroke-width="10"/>
    <path d="M0 0 L0 ${-r} A${r} ${r} 0 1 1 ${-r} 0 Z" fill="${G}" opacity=".9"/>
    <path d="M0 0 L${-r * 0.85} 0" stroke="${K}" stroke-width="10" stroke-linecap="round"/>
    <circle r="12" fill="${K}"/>
  </g>`;
}

// ---------- Vorlagen ----------
// 3:2 Querformat (900×600) im Flaggen-Look; quadratisch 600×600; breit 900×300
const rahmen32 = (inner) => `
  <rect x="6" y="6" width="888" height="588" rx="28" fill="${W}"/>
  <clipPath id="r32"><rect x="22" y="22" width="856" height="556" rx="16"/></clipPath>
  <g clip-path="url(#r32)">${inner}</g>
  <rect x="22" y="22" width="856" height="556" rx="16" fill="none" stroke="${K}" stroke-width="4"/>`;

const T = {
  // Flagge grün/weiß, zwei Embleme, Text oben + unten
  flagge: ({ oben, unten, links = 'schild', rechts = 'violett' }) => rahmen32(`
    <rect x="0" y="0" width="900" height="300" fill="${G}"/>
    <rect x="0" y="300" width="900" height="300" fill="${W}"/>
    ${hart(oben, 450, 150, 130, 800, W)}
    ${links === 'schild' ? schildWW(300, 318, 1.05) : links === 'stern' ? stern(300, 318, 80, K) : ''}
    ${rechts === 'violett' ? keinViolett(600, 318, 92) : rechts === 'schild' ? schildWW(600, 318, 1.05, '14') : rechts === 'uhr' ? uhr(600, 330, 82) : ''}
    ${hart(unten, 450, 536, 92, 810, G, K, 9)}`),
  // Flagge mit einem großen Emblem in der Mitte
  flagge1: ({ oben, unten, emblem = 'schild', label }) => rahmen32(`
    <rect x="0" y="0" width="900" height="300" fill="${G}"/>
    <rect x="0" y="300" width="900" height="300" fill="${W}"/>
    ${stern(110, 300, 36, K)}${stern(790, 300, 36, K)}
    ${emblem === 'schild' ? schildWW(450, 312, 1.25, label || 'WW') : emblem === 'violett' ? keinViolett(450, 312, 112) : emblem === 'uhr' ? uhr(450, 320, 100) : ''}
    ${hart(oben, 450, 150, 124, 800, W)}
    ${hart(unten, 450, 540, 92, 810, G, K, 9)}`),
  // Diagonal geteilte Flagge mit großer Schrift
  diagonal: ({ a, b, c }) => rahmen32(`
    <rect x="0" y="0" width="900" height="600" fill="${W}"/>
    <path d="M0 0H900V250L0 340Z" fill="${G}"/>
    ${hart(a, 450, 200, 150, 800, W, K, 14)}
    ${hart(b, 450, 470, 118, 800, G, K, 10)}
    ${c ? txt(c, 450, 548, 40, 700, K) : ''}`),
  // Figur mit Farbspritzern und Textbalken (quadratisch)
  figur: ({ a, variante = 'ruhig', haube = 'WW', farben }) => {
    const seed = seedOf(a + variante);
    return `
    <rect x="6" y="6" width="588" height="588" rx="28" fill="${W}"/>
    ${splatter(300, 270, 230, seed, farben)}
    ${figur(300, 250, 1, variante, haube)}
    ${balkenText(a, 300, 500, 500, 74)}`;
  },
  // Abzeichen rund
  abzeichen: ({ a, oben, unten, dunkel }) => `
    <circle cx="300" cy="300" r="292" fill="${W}"/>
    <circle cx="300" cy="300" r="272" fill="${dunkel ? K : G}"/>
    <circle cx="300" cy="300" r="176" fill="${W}"/>
    <circle cx="300" cy="300" r="164" fill="${dunkel ? G : GD}"/>
    ${arc(oben, 300, 300, 196, 62, W)}
    ${arc(unten, 300, 300, 196, 48, W, true)}
    ${stern(80, 300, 20, W)}${stern(520, 300, 20, W)}
    ${txt(a, 300, 342, 112, 260, W, { stroke: K, sw: 8 })}`,
  // Straßenschild, breit
  schild: ({ nr, a, b }) => `
    <rect x="6" y="6" width="888" height="288" rx="26" fill="${W}"/>
    <rect x="24" y="24" width="852" height="252" rx="14" fill="${G}"/>
    <rect x="38" y="38" width="824" height="224" rx="8" fill="none" stroke="${W}" stroke-width="6"/>
    ${txt(nr, 130, 190, 110, 150, W)}
    <rect x="228" y="62" width="5" height="176" fill="${W}"/>
    ${txt(a, 545, 170, 108, 560, W)}
    ${txt(b, 545, 228, 40, 560, GL)}`,
  // Schal, breit
  schal: ({ a, b }) => `
    <rect x="6" y="6" width="888" height="288" rx="30" fill="${W}"/>
    <clipPath id="s"><rect x="22" y="22" width="856" height="256" rx="18"/></clipPath>
    <g clip-path="url(#s)">
      <rect x="0" y="0" width="900" height="300" fill="${K}"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${22 + i * 34}" y="0" width="17" height="300" fill="${i % 2 ? W : G}"/><rect x="${861 - i * 34}" y="0" width="17" height="300" fill="${i % 2 ? W : G}"/>`).join('')}
      <rect x="0" y="22" width="900" height="14" fill="${G}"/><rect x="0" y="264" width="900" height="14" fill="${G}"/>
    </g>
    ${hart(a, 450, b ? 172 : 196, 120, 600, W, G, 8)}
    ${b ? txt(b, 450, 238, 46, 560, GL) : ''}`,
  // Ticket
  ticket: ({ a, b, c }) => `
    <path d="M44 140h512v96a54 54 0 0 0 0 112v112H44V348a54 54 0 0 0 0-112z" fill="${W}" stroke="${W}" stroke-width="40" stroke-linejoin="round"/>
    <path d="M44 140h512v96a54 54 0 0 0 0 112v112H44V348a54 54 0 0 0 0-112z" fill="${G}" stroke="${K}" stroke-width="4"/>
    <path d="M430 150v300" stroke="${W}" stroke-width="4" stroke-dasharray="12 10"/>
    ${hart(a, 250, 300, 104, 280, W)}
    ${txt(b, 250, 360, 46, 280, GL)}
    ${txt(c, 250, 420, 26, 280, W)}
    <g transform="rotate(-90 492 300)">${txt('GÜLTIG FÜR IMMER', 492, 314, 34, 260, W)}</g>`,
  // Freundschaft
  freund: ({ a, b, c }) => rahmen32(`
    <rect x="0" y="0" width="900" height="600" fill="${G}"/>
    <path d="M900 0V600H260z" fill="${K}"/><path d="M900 330V600H600z" fill="${R}"/>
    ${schildWW(170, 300, 0.8)}
    ${hart(a, 520, 250, 130, 560, W)}
    ${hart(b, 520, 400, 130, 560, W)}
    ${txt(c, 520, 486, 44, 500, W)}`),
  pack: ({ a, n }) => {
    const mini = (x, y, r, fill, label) => `
      <g transform="translate(${x} ${y}) rotate(${r})">
        <rect x="-110" y="-70" width="220" height="140" rx="18" fill="${W}" stroke="#0002" stroke-width="2"/>
        <rect x="-98" y="-58" width="196" height="58" rx="10" fill="${G}"/>
        <rect x="-98" y="0" width="196" height="58" rx="10" fill="${fill}"/>
        ${txt(label, 0, 18, 46, 170, W, { stroke: K, sw: 6 })}
      </g>`;
    return `
      <circle cx="300" cy="300" r="292" fill="#EFEDE6"/>
      ${mini(210, 190, -12, '#ddd', 'WIEN WEST')}
      ${mini(400, 200, 10, V, 'ANTI VIOLETT')}
      ${mini(190, 380, 8, K, 'FORZA RAPID')}
      ${mini(400, 395, -8, GD, 'WESTSTADION')}
      <circle cx="300" cy="300" r="96" fill="${W}"/>
      <circle cx="300" cy="300" r="84" fill="${K}"/>
      ${txt(String(n), 300, 318, 92, 130, W)}
      ${txt(a, 300, 560, 44, 360, K)}`;
  },
  mystery: ({ n }) => `
    <circle cx="300" cy="300" r="292" fill="${W}"/>
    <circle cx="300" cy="300" r="272" fill="${K}"/>
    ${txt('?', 300, 360, 300, 200, G)}
    ${txt(`${n} ÜBERRASCHUNGEN`, 300, 470, 48, 360, W)}`,
};
const FORMAT_OF = { flagge: '32', flagge1: '32', diagonal: '32', freund: '32', schild: 'breit', schal: 'breit' };

// ---------- Produkte ----------
// [slug, name, vorlage, daten, typ, kategorie, beschreibung, bestseller]
// typ: einzel (ca. 8 cm bzw. 9 × 6 cm) | breit (ca. 15 × 5 cm) | pack
const P = [
  // ANTI VIOLETT & DERBY
  ['wien-gehoert-uns', 'Wien gehört uns!', 'flagge', { oben: 'WIEN GEHÖRT UNS!', unten: 'VIOLETT HAT HIER NIX VERLOREN' }, 'einzel', 'derby', 'Grün-weiße Flagge, Wien-West-Schild und eine klare Ansage an die andere Seite der Stadt.', true],
  ['anti-violett', 'Anti Violett', 'flagge1', { oben: 'ANTI VIOLETT', unten: 'WIEN IST GRÜN-WEISS', emblem: 'violett' }, 'einzel', 'derby', 'Der Klassiker vor jedem Derby – Violett durchgestrichen, Grün-Weiß drüber.', true],
  ['anti-violett-rund', 'Anti Violett – Rund', 'abzeichen', { a: 'ANTI', oben: 'GEGEN VIOLETT', unten: 'GRÜN-WEISS 1899', dunkel: true }, 'einzel', 'derby', 'Das Anti-Motiv als rundes Abzeichen – für Laternenmast, Spind und Laptop.', true],
  ['derbysieger', 'Derbysieger', 'diagonal', { a: 'DERBYSIEGER', b: 'WIEN WEST', c: 'DIE STADT IST GRÜN-WEISS' }, 'einzel', 'derby', 'Für den Montag nach dem Derby – und alle Tage, an denen man daran erinnern muss.', true],
  ['zehnter-durchfahrt', '10. Bezirk? Nur Durchfahrt', 'flagge1', { oben: '10. BEZIRK?', unten: 'NUR DURCHFAHRT', emblem: 'violett' }, 'einzel', 'derby', 'Derby-Schmäh für alle, die in Favoriten höchstens umsteigen.', true],
  ['violett-nein-danke', 'Violett? Nein, danke.', 'diagonal', { a: 'VIOLETT?', b: 'NEIN, DANKE.', c: 'GRÜN-WEISS SEIT 1899' }, 'einzel', 'derby', 'Freundlich, aber bestimmt. Für Bürotür, Kühlschrank und Kollegen mit falscher Farbe.', false],
  ['derbytag-feiertag', 'Derbytag ist Feiertag', 'figur', { a: 'DERBYTAG IST FEIERTAG', variante: 'schal' }, 'einzel', 'derby', 'Schal hoch, Haube auf: Am Derbytag hat alles andere Pause.', false],
  // FORZA RAPID
  ['forza-rapid', 'Forza Rapid', 'figur', { a: 'FORZA RAPID', variante: 'faust' }, 'einzel', 'forza', 'Eigene Figur mit Haube, Schal vorm Gesicht und Faust in der Luft – der Schlachtruf als Sticker.', true],
  ['ynwa-west', 'You’ll never walk alone', 'figur', { a: 'YOU’LL NEVER WALK ALONE', variante: 'ruhig' }, 'einzel', 'forza', 'Die Hymne der Kurve – mit unserer Figur aus Wien West, Haube auf, Schal vorm Gesicht.', true],
  ['forza-rapid-schal', 'Forza Rapid – Schal', 'schal', { a: 'FORZA RAPID', b: 'WESTSTADION · SEIT 1899' }, 'breit', 'forza', 'Im Schal-Look. Breitformat für Laptop, Koffer oder Heckscheibe.', true],
  ['scr-1899', 'SCR 1899', 'flagge1', { oben: 'SCR 1899', unten: 'GRÜN-WEISS BIS ZUM SCHLUSS', emblem: 'schild', label: 'SCR' }, 'einzel', 'forza', 'Drei Buchstaben, die jeder im Block kennt – auf der grün-weißen Flagge.', true],
  ['scr-schal', 'SCR SCR SCR', 'schal', { a: 'SCR · SCR · SCR' }, 'breit', 'forza', 'Wie der Schal, der in keinem Kasten fehlt – als Sticker im Breitformat.', false],
  ['einmal-rapid', 'Einmal Rapid, immer Rapid', 'diagonal', { a: 'EINMAL RAPID', b: 'IMMER RAPID', c: 'WIEN WEST · SEIT 1899' }, 'einzel', 'forza', 'Man wird nicht Rapidler, man bleibt es.', true],
  ['rapid-viertelstunde', 'Rapid-Viertelstunde', 'flagge1', { oben: 'RAPID-VIERTELSTUNDE', unten: 'AB DER 75. WIRD GEKLATSCHT', emblem: 'uhr' }, 'einzel', 'forza', 'Die Stoppuhr steht auf 75 – und das ganze Stadion klatscht. Tradition, die es nur bei uns gibt.', true],
  // WIEN WEST & WESTSTADION
  ['wien-west', 'Wien West', 'flagge1', { oben: 'WIEN WEST', unten: 'HÜTTELDORF · 1140', emblem: 'schild' }, 'einzel', 'wienwest', 'Unser Namensgeber auf der grün-weißen Flagge – mit eigenem Wien-West-Schild.', true],
  ['weststadion', 'Weststadion', 'diagonal', { a: 'WESTSTADION', b: 'UNSER WOHNZIMMER', c: 'HÜTTELDORF · 1140 WIEN' }, 'einzel', 'wienwest', 'Für das Wohnzimmer in Hütteldorf. Egal, was auf dem Schild über dem Eingang steht.', true],
  ['weststadion-schal', 'Weststadion – Schal', 'schal', { a: 'WESTSTADION', b: 'HÜTTELDORF · 1140' }, 'breit', 'wienwest', 'Das Weststadion im Schal-Look, Breitformat.', true],
  ['huetteldorf-schild', 'Hütteldorf – Straßenschild', 'schild', { nr: '14.', a: 'HÜTTELDORF', b: 'WIEN WEST · SEIT 1899' }, 'breit', 'wienwest', 'Im Look der Wiener Straßenschilder – nur in Grün.', true],
  ['block-west', 'Block West', 'figur', { a: 'BLOCK WEST', variante: 'schal', haube: 'BW' }, 'einzel', 'wienwest', 'Schal hoch im Block West – eigene Figur mit Farbspritzern in Grün und Schwarz.', true],
  ['wien-west-14', 'Wien West – 14', 'flagge', { oben: 'WIEN WEST', unten: 'HÜTTELDORF IST ÜBERALL', links: 'schild', rechts: 'schild' }, 'einzel', 'wienwest', 'Zwei Schilder, eine Flagge: für jeden Laternenmast zwischen Hütteldorf und dem Auswärtsblock.', false],
  ['st-hanappi', 'St. Hanappi', 'abzeichen', { a: 'ST.', oben: 'SANKT HANAPPI', unten: 'FÜR IMMER IN UNS' }, 'einzel', 'wienwest', 'Für alle, die noch im alten Hanappi gestanden sind. Das Stadion ist weg, die Erinnerung bleibt.', false],
  ['pfarrwiese', 'Pfarrwiese 1912', 'abzeichen', { a: '1912', oben: 'PFARRWIESE', unten: 'HÜTTELDORF', dunkel: true }, 'einzel', 'wienwest', 'Hommage an die legendäre Heimstätte von 1912 bis 1977.', false],
  // KURVE & AUSWÄRTS
  ['auswaerts', 'Auswärts immer dabei', 'ticket', { a: 'AUSWÄRTS', b: 'IMMER DABEI', c: 'BLOCK · REIHE · PLATZ: EGAL' }, 'einzel', 'kurve', 'Im Ticket-Look für alle, die jede Auswärtsfahrt mitnehmen. Egal wie weit, egal wie kalt.', true],
  ['gegen-modernen-fussball', 'Gegen modernen Fußball', 'figur', { a: 'GEGEN MODERNEN FUSSBALL', variante: 'faust', farben: [K, G, GD, '#999'] }, 'einzel', 'kurve', 'Stehplätze statt VIP-Logen, Tradition statt Event. Faust hoch.', true],
  ['wien-nuernberg', 'Wien – Nürnberg', 'freund', { a: 'WIEN', b: 'NÜRNBERG', c: 'FREUNDSCHAFT' }, 'einzel', 'kurve', 'Für die Fanfreundschaft zwischen Hütteldorf und Franken – grün, schwarz, rot.', true],
  ['jungs-aus-dem-westen', 'Jungs & Mädels aus dem Westen', 'figur', { a: 'AUS DEM WESTEN', variante: 'ruhig', farben: [G, GL, K, GD] }, 'einzel', 'kurve', 'Eigene Figur, eigene Farbspritzer. Für alle, die im Westen daheim sind.', false],
  ['kurve-statt-couch', 'Kurve statt Couch', 'diagonal', { a: 'KURVE', b: 'STATT COUCH', c: '90 MINUTEN STEHEN, SINGEN, SPRINGEN' }, 'einzel', 'kurve', 'Für alle, die Fußball nicht im Fernsehen schauen.', false],
  ['gruenes-blut', 'Grünes Blut, weißes Herz', 'flagge1', { oben: 'GRÜNES BLUT', unten: 'WEISSES HERZ', emblem: 'schild' }, 'einzel', 'kurve', 'Zwei Zeilen, die erklären, warum am Spieltag nichts anderes im Kalender steht.', true],
  ['laut-treu', 'Laut. Treu. Grün-Weiß.', 'diagonal', { a: 'LAUT. TREU.', b: 'GRÜN-WEISS.', c: 'IN JEDER LIGA, IN JEDEM STADION' }, 'einzel', 'kurve', 'Drei Worte für 90 Minuten Dauersupport.', false],
  ['32-titel', '32 Titel', 'abzeichen', { a: '32', oben: 'REKORDMEISTER', unten: 'WIEN WEST · 1899' }, 'einzel', 'kurve', 'Für alle, die die Meistertitel auswendig aufzählen können.', false],
  // PACKS
  ['starter-3er', '3er Starter-Pack', 'pack', { a: 'STARTER-PACK', n: 3 }, 'pack', 'packs', 'Die drei Topseller: Wien gehört uns!, Forza Rapid, Weststadion.', false],
  ['topseller-5er', '5er Topseller-Pack', 'pack', { a: 'TOPSELLER-PACK', n: 5 }, 'pack', 'packs', 'Fünf Lieblinge aus dem Block in einem Kuvert.', true],
  ['mix-10er', '10er Mix-Pack', 'pack', { a: 'MIX-PACK · GRATIS VERSAND', n: 10 }, 'pack', 'packs', 'Zehn verschiedene Motive für die nächste Auswärtsfahrt. Mit 15 € genau an der Gratis-Versand-Grenze.', true],
  ['kurve-25er', '25er Kurven-Pack', 'pack', { a: 'KURVEN-PACK', n: 25 }, 'pack', 'packs', 'Für Fanclubs, Stammtische und alle, die auf dem Weg ins Weststadion mehr als einen Laternenmast bekleben.', true],
  ['block-50er', '50er Block-Pack', 'pack', { a: 'BLOCK-PACK', n: 50 }, 'pack', 'packs', '50 Sticker, alle Motive gemischt. Bester Stückpreis – zum Aufteilen in der Gruppe.', false],
  ['mystery-15er', 'Mystery-Pack (15 Stück)', 'mystery', { n: 15 }, 'pack', 'packs', '15 Sticker, zufällig gezogen. Mit Sondermotiven, die es einzeln nicht gibt.', false],
];

const PREIS = { einzel: 2.5, breit: 3.9 };
const PACK = {
  'starter-3er': [6.9, 7.5, 3],
  'topseller-5er': [9.9, 12.5, 5],
  'mix-10er': [15, 25, 10],
  'kurve-25er': [29, 62.5, 25],
  'block-50er': [49, 125, 50],
  'mystery-15er': [19, 37.5, 15],
};
const FORMAT_TXT = {
  quadrat: 'ca. 8 × 8 cm, konturgeschnitten',
  '32': 'ca. 9 × 6 cm',
  breit: 'ca. 15 × 5 cm, konturgeschnitten',
  pack: 'gemischte Formate (ca. 8 cm)',
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const writeMd = process.argv.includes('--md');
let i = 0;
for (const [slug, name, tpl, data, typ, kategorie, kurz, bestseller] of P) {
  i++;
  const f = FORMAT_OF[tpl] || 'quadrat';
  const vb = f === '32' ? '0 0 900 600' : f === 'breit' ? '0 0 900 300' : '0 0 600 600';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${esc(name)}">${T[tpl](data)}</svg>`;
  fs.writeFileSync(path.join(OUT_IMG, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg), { density: 200 })
    .resize(f === 'quadrat' ? 1000 : 1200)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_IMG, `${slug}.png`));

  if (!writeMd) continue;
  const isPack = typ === 'pack';
  const [preis, wert, stueck] = isPack ? PACK[slug] : [PREIS[typ], undefined, 1];
  const format = FORMAT_TXT[isPack ? 'pack' : f];
  const md = `---
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
`;
  fs.writeFileSync(path.join(OUT_MD, `${slug}.md`), md);
}
console.log(`${P.length} Produkte erzeugt${writeMd ? ' (inkl. Markdown)' : ''}.`);
