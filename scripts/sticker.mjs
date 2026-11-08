// Erzeugt 30 Sticker-Designs + 6 Packs (Markdown für Astro/Sveltia) und die Grafiken (SVG + PNG).
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

const G = '#00753D'; // Grün
const GD = '#004B27'; // Dunkelgrün
const GL = '#7BD99B'; // Hellgrün
const W = '#FFFFFF';
const K = '#111111';
const V = '#5B2A86'; // Violett (nur Anti-Motive)
const R = '#C8102E'; // Rot (Freundschaft)

/** Text als Pfad, horizontal zentriert, auf maxW skaliert */
function txt(str, cx, baseline, size, maxW, fill) {
  let s = size;
  const w = font.getAdvanceWidth(str, s);
  if (w > maxW) s = (s * maxW) / w;
  const width = font.getAdvanceWidth(str, s);
  return `<path d="${font.getPath(str, cx - width / 2, baseline, s).toPathData(2)}" fill="${fill}"/>`;
}
/** Text auf Kreisbogen (oben oder unten), zentriert */
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
      const deg = (a * 180) / Math.PI;
      const p = font.getPath(c, -w / 2, 0, size).toPathData(2);
      const off = unten ? r + size * 0.72 : -r;
      return `<path d="${p}" fill="${fill}" transform="translate(${cx} ${cy}) rotate(${deg.toFixed(2)}) translate(0 ${off.toFixed(1)})"/>`;
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

// ---------- Vorlagen (viewBox 600×600, breite Formate 900×300) ----------
const T = {
  kreis: ({ a, b }) => `
    <circle cx="300" cy="300" r="292" fill="${W}"/>
    <circle cx="300" cy="300" r="270" fill="${G}"/>
    <circle cx="300" cy="300" r="238" fill="none" stroke="${W}" stroke-width="10"/>
    <path d="M110 300h380" stroke="${W}" stroke-width="6" opacity=".35"/>
    ${txt(a, 300, 290, 120, 360, W)}
    ${txt(b, 300, 395, 64, 330, W)}`,
  abzeichen: ({ a, oben, unten, dunkel }) => `
    <circle cx="300" cy="300" r="292" fill="${W}"/>
    <circle cx="300" cy="300" r="272" fill="${dunkel ? K : G}"/>
    <circle cx="300" cy="300" r="176" fill="${W}"/>
    <circle cx="300" cy="300" r="164" fill="${dunkel ? G : GD}"/>
    ${arc(oben, 300, 300, 196, 62, W)}
    ${arc(unten, 300, 300, 196, 48, W, true)}
    ${stern(80, 300, 20, W)}${stern(520, 300, 20, W)}
    ${txt(a, 300, 342, 112, 260, W)}`,
  balken: ({ a, b }) => `
    <rect x="8" y="138" width="584" height="324" rx="40" fill="${W}"/>
    <rect x="28" y="158" width="544" height="284" rx="26" fill="${K}"/>
    <rect x="28" y="352" width="544" height="90" fill="${G}"/>
    <rect x="28" y="340" width="544" height="12" fill="${W}"/>
    ${txt(a, 300, 318, 140, 500, W)}
    ${txt(b, 300, 420, 58, 500, W)}`,
  streifen: ({ a, b }) => `
    <rect x="8" y="8" width="584" height="584" rx="56" fill="${W}"/>
    <clipPath id="c"><rect x="28" y="28" width="544" height="544" rx="40"/></clipPath>
    <g clip-path="url(#c)">${Array.from({ length: 9 }, (_, i) => `<rect x="${28 + i * 64}" y="0" width="32" height="600" fill="${G}"/>`).join('')}</g>
    <rect x="60" y="190" width="480" height="230" rx="10" fill="${K}"/>
    ${txt(a, 300, 312, 110, 430, W)}
    ${txt(b, 300, 392, 60, 430, GL)}`,
  stempel: ({ a, b }) => `
    <rect x="8" y="128" width="584" height="344" rx="36" fill="${W}"/>
    <rect x="34" y="154" width="532" height="292" rx="18" fill="none" stroke="${G}" stroke-width="12"/>
    <rect x="54" y="174" width="492" height="252" rx="8" fill="none" stroke="${G}" stroke-width="4"/>
    ${txt(a, 300, 318, 120, 450, G)}
    <rect x="120" y="340" width="360" height="4" fill="${G}"/>
    ${txt(b, 300, 398, 44, 430, K)}`,
  slogan: ({ a, b }) => `
    <rect x="8" y="98" width="584" height="404" rx="30" fill="${W}"/>
    <rect x="30" y="120" width="540" height="360" rx="14" fill="${GD}"/>
    ${txt(a, 300, 270, 130, 480, W)}
    <rect x="60" y="300" width="480" height="128" rx="6" fill="${W}" transform="rotate(-2 300 364)"/>
    ${txt(b, 300, 400, 96, 440, GD)}`,
  anti: ({ a, b, c }) => `
    <rect x="8" y="88" width="584" height="424" rx="34" fill="${W}"/>
    <rect x="28" y="108" width="544" height="384" rx="20" fill="${K}"/>
    ${txt(a, 300, 230, 96, 460, GL)}
    <rect x="62" y="256" width="476" height="140" rx="8" fill="${V}"/>
    ${txt(b, 300, 366, 116, 430, W)}
    <path d="M70 392 530 260" stroke="${W}" stroke-width="30" stroke-linecap="round"/>
    <path d="M70 392 530 260" stroke="${G}" stroke-width="16" stroke-linecap="round"/>
    ${c ? txt(c, 300, 460, 40, 440, W) : ''}`,
  schal: ({ a, b }) => `
    <rect x="6" y="6" width="888" height="288" rx="30" fill="${W}"/>
    <clipPath id="s"><rect x="22" y="22" width="856" height="256" rx="18"/></clipPath>
    <g clip-path="url(#s)">
      <rect x="0" y="0" width="900" height="300" fill="${K}"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="${22 + i * 34}" y="0" width="17" height="300" fill="${i % 2 ? W : G}"/><rect x="${861 - i * 34}" y="0" width="17" height="300" fill="${i % 2 ? W : G}"/>`).join('')}
      <rect x="0" y="22" width="900" height="14" fill="${G}"/><rect x="0" y="264" width="900" height="14" fill="${G}"/>
    </g>
    ${txt(a, 450, b ? 172 : 196, 120, 600, W)}
    ${b ? txt(b, 450, 238, 46, 560, GL) : ''}`,
  schild: ({ nr, a, b }) => `
    <rect x="6" y="6" width="888" height="288" rx="26" fill="${W}"/>
    <rect x="24" y="24" width="852" height="252" rx="14" fill="${G}"/>
    <rect x="38" y="38" width="824" height="224" rx="8" fill="none" stroke="${W}" stroke-width="6"/>
    ${txt(nr, 130, 190, 110, 150, W)}
    <rect x="228" y="62" width="5" height="176" fill="${W}"/>
    ${txt(a, 545, 170, 108, 560, W)}
    ${txt(b, 545, 228, 40, 560, GL)}`,
  ticket: ({ a, b, c }) => `
    <path d="M44 140h512v96a54 54 0 0 0 0 112v112H44V348a54 54 0 0 0 0-112z" fill="${W}" stroke="${W}" stroke-width="40" stroke-linejoin="round"/>
    <path d="M44 140h512v96a54 54 0 0 0 0 112v112H44V348a54 54 0 0 0 0-112z" fill="${G}"/>
    <path d="M430 150v300" stroke="${W}" stroke-width="4" stroke-dasharray="12 10"/>
    ${txt(a, 250, 300, 104, 280, W)}
    ${txt(b, 250, 360, 46, 280, GL)}
    ${txt(c, 250, 420, 26, 280, W)}
    <g transform="rotate(-90 492 300)">${txt('GÜLTIG FÜR IMMER', 492, 314, 34, 260, W)}</g>`,
  freund: ({ a, b, c }) => `
    <rect x="8" y="118" width="584" height="364" rx="34" fill="${W}"/>
    <clipPath id="f"><rect x="28" y="138" width="544" height="324" rx="20"/></clipPath>
    <g clip-path="url(#f)"><rect x="0" y="0" width="600" height="600" fill="${G}"/><path d="M600 138V462H170z" fill="${K}"/><path d="M600 330V462H420z" fill="${R}"/></g>
    ${txt(a, 300, 262, 100, 480, W)}
    ${txt(b, 300, 366, 100, 480, W)}
    ${txt(c, 300, 432, 36, 440, W)}`,
  herz: ({ a, b }) => `
    <path d="M300 548C120 420 30 330 30 210 30 120 100 52 188 52c52 0 92 26 112 64 20-38 60-64 112-64 88 0 158 68 158 158 0 120-90 210-270 338z" fill="${W}"/>
    <path d="M300 516C140 400 54 318 54 212 54 134 114 76 190 76c50 0 88 28 110 70 22-42 60-70 110-70 76 0 136 58 136 136 0 106-86 188-246 304z" fill="${G}"/>
    ${txt(a, 300, 262, 92, 400, W)}
    ${txt(b, 300, 346, 72, 320, W)}`,
  pack: ({ a, n }) => {
    const mini = (x, y, r, fill, label) => `
      <g transform="translate(${x} ${y}) rotate(${r})">
        <rect x="-110" y="-70" width="220" height="140" rx="18" fill="${W}" stroke="#0002" stroke-width="2"/>
        <rect x="-98" y="-58" width="196" height="116" rx="10" fill="${fill}"/>
        ${txt(label, 0, 18, 46, 170, W)}
      </g>`;
    return `
      <circle cx="300" cy="300" r="292" fill="#EFEDE6"/>
      ${mini(210, 190, -12, G, 'WIEN WEST')}
      ${mini(400, 200, 10, V, 'ANTI VIOLETT')}
      ${mini(190, 380, 8, K, 'FORZA RAPID')}
      ${mini(400, 395, -8, GD, 'HÜTTELDORF')}
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
const BREIT = new Set(['schal', 'schild']);

// ---------- Produkte ----------
// [slug, name, vorlage, daten, typ, kategorie, beschreibung, bestseller]
// typ: einzel (Ø ca. 8 cm) | breit (ca. 15 × 5 cm) | pack
const P = [
  // DERBY / ANTI VIOLETT
  ['anti-violett', 'Anti Violett', 'anti', { a: 'ANTI', b: 'VIOLETT', c: 'WIEN IST GRÜN-WEISS' }, 'einzel', 'derby', 'Der Klassiker vor jedem Derby. Kurz, klar, durchgestrichen – mehr braucht es nicht.', true],
  ['anti-violett-rund', 'Anti Violett – Rund', 'abzeichen', { a: 'ANTI', oben: 'GEGEN VIOLETT', unten: 'GRÜN-WEISS 1899', dunkel: true }, 'einzel', 'derby', 'Das Anti-Motiv als rundes Abzeichen – für Laternenmast, Spind und Laptop.', true],
  ['violett-keine-farbe', 'Violett ist keine Farbe', 'anti', { a: 'SORRY, ABER', b: 'VIOLETT', c: 'IST KEINE FARBE' }, 'einzel', 'derby', 'Für alle, die bei Violett nur an eins denken: an den nächsten Derbysieg.', false],
  ['violett-nein-danke', 'Violett? Nein, danke.', 'stempel', { a: 'VIOLETT?', b: 'NEIN, DANKE.' }, 'einzel', 'derby', 'Freundlich, aber bestimmt. Derby-Schmäh für Bürotür und Kühlschrank.', true],
  ['derbysieger', 'Derbysieger', 'balken', { a: 'DERBYSIEGER', b: 'WIEN BLEIBT GRÜN' }, 'einzel', 'derby', 'Für den Montag nach dem Derby – und für alle Tage, an denen man daran erinnern muss.', true],
  ['wien-ist-gruen-weiss', 'Wien ist grün-weiß', 'slogan', { a: 'WIEN IST', b: 'GRÜN-WEISS' }, 'einzel', 'derby', 'Eine Stadt, zwei Farben. Und nur eine davon zählt.', true],
  ['derbytag-feiertag', 'Derbytag ist Feiertag', 'streifen', { a: 'DERBYTAG', b: 'IST FEIERTAG' }, 'einzel', 'derby', 'Arbeit, Familie, Termine? Am Derbytag hat alles andere Pause.', false],
  // FORZA RAPID
  ['forza-rapid', 'Forza Rapid', 'abzeichen', { a: 'FORZA', oben: 'FORZA RAPID', unten: 'WIEN WEST · 1899' }, 'einzel', 'forza', 'Der Schlachtruf als rundes Abzeichen mit Sternen.', true],
  ['forza-rapid-schal', 'Forza Rapid – Schal', 'schal', { a: 'FORZA RAPID', b: 'HÜTTELDORF · SEIT 1899' }, 'breit', 'forza', 'Im Schal-Look mit Streifen. Breitformat für Laptop, Koffer oder Heckscheibe.', true],
  ['scr-1899', 'SCR 1899', 'kreis', { a: 'SCR', b: 'SEIT 1899' }, 'einzel', 'forza', 'Drei Buchstaben, die jeder im Block kennt. Rund, schlicht, überall.', true],
  ['scr-schal', 'SCR SCR SCR', 'schal', { a: 'SCR · SCR · SCR' }, 'breit', 'forza', 'Wie der Schal, der in keinem Kasten fehlt – als Sticker im Breitformat.', false],
  ['einmal-rapid', 'Einmal Rapid, immer Rapid', 'streifen', { a: 'EINMAL RAPID', b: 'IMMER RAPID' }, 'einzel', 'forza', 'Man wird nicht Rapidler, man bleibt es. Streifen-Optik im Vereins-Look.', true],
  ['rapid-viertelstunde', 'Rapid-Viertelstunde', 'kreis', { a: '75. MINUTE', b: 'RAPID-VIERTELSTUNDE' }, 'einzel', 'forza', 'Wenn in der 75. Minute das ganze Stadion klatscht. Die Tradition, die es nur bei uns gibt.', true],
  ['mehr-als-fussball', 'Mehr als Fußball', 'slogan', { a: 'RAPID IST', b: 'MEHR ALS FUSSBALL' }, 'einzel', 'forza', 'Für alle, deren Wochenplan sich nach dem Spielplan richtet.', false],
  // WIEN WEST / HÜTTELDORF
  ['wien-west-huetteldorf', 'Wien West Hütteldorf', 'abzeichen', { a: '1140', oben: 'WIEN WEST', unten: 'HÜTTELDORF' }, 'einzel', 'wienwest', 'Unser Namensgeber: Wien West, Hütteldorf, 1140 – rund und mit Sternen.', true],
  ['huetteldorf-schild', 'Hütteldorf – Straßenschild', 'schild', { nr: '14.', a: 'HÜTTELDORF', b: 'WIEN WEST · SEIT 1899' }, 'breit', 'wienwest', 'Im Look der Wiener Straßenschilder – nur in Grün. Breitformat.', true],
  ['wien-west-schal', 'Wien West – Schal', 'schal', { a: 'WIEN WEST', b: 'HÜTTELDORF' }, 'breit', 'wienwest', 'Wien West im Schal-Look. Für alle, die wissen, wo der Westen liegt.', true],
  ['huetteldorf-ist-ueberall', 'Hütteldorf ist überall', 'streifen', { a: 'HÜTTELDORF', b: 'IST ÜBERALL' }, 'einzel', 'wienwest', 'Laternenmast in Graz, Bahnhof in Salzburg, Raststation irgendwo: Hütteldorf ist dort, wo wir hinfahren.', true],
  ['seit-1899', 'Seit 1899', 'kreis', { a: 'SEIT 1899', b: 'GRÜN-WEISS' }, 'einzel', 'wienwest', 'Das Jahr, mit dem alles anfängt. Rund, schlicht, gehört auf jede Tür zwischen Hütteldorf und Auswärtsblock.', true],
  ['block-west', 'Block West', 'balken', { a: 'BLOCK WEST', b: 'STEHT. IMMER.' }, 'einzel', 'wienwest', 'Der Name sagt alles. Tausende Stehplätze, eine Stimme.', true],
  ['westtribuene', 'Westtribüne', 'stempel', { a: 'WESTTRIBÜNE', b: 'STEHPLATZ STATT SITZPLATZ' }, 'einzel', 'wienwest', 'Für alle, die 90 Minuten stehen, singen und springen.', false],
  ['st-hanappi', 'St. Hanappi', 'stempel', { a: 'ST. HANAPPI', b: 'FÜR IMMER IN UNS' }, 'einzel', 'wienwest', 'Für alle, die noch im alten Hanappi gestanden sind. Das Stadion ist weg, die Erinnerung bleibt.', false],
  ['pfarrwiese', 'Pfarrwiese', 'abzeichen', { a: '1912', oben: 'PFARRWIESE', unten: 'HÜTTELDORF', dunkel: true }, 'einzel', 'wienwest', 'Hommage an die legendäre Heimstätte von 1912 bis 1977.', false],
  // KURVE & AUSWÄRTS
  ['auswaerts', 'Auswärts immer dabei', 'ticket', { a: 'AUSWÄRTS', b: 'IMMER DABEI', c: 'BLOCK · REIHE · PLATZ: EGAL' }, 'einzel', 'kurve', 'Im Ticket-Look für alle, die jede Auswärtsfahrt mitnehmen. Egal wie weit, egal wie kalt.', true],
  ['gegen-modernen-fussball', 'Gegen modernen Fußball', 'balken', { a: 'GEGEN MODERNEN', b: 'FUSSBALL' }, 'einzel', 'kurve', 'Stehplätze statt VIP-Logen, Tradition statt Event. Ein Satz, den jede Kurve versteht.', true],
  ['wien-nuernberg', 'Wien – Nürnberg', 'freund', { a: 'WIEN', b: 'NÜRNBERG', c: 'FREUNDSCHAFT' }, 'einzel', 'kurve', 'Für die Fanfreundschaft zwischen Hütteldorf und Franken – grün, schwarz, rot.', true],
  ['gruen-weisse-liebe', 'Grün-weiße Liebe', 'herz', { a: 'GRÜN-WEISSE', b: 'LIEBE' }, 'einzel', 'kurve', 'Herz in Vereinsfarben. Auch beliebt bei den Jüngsten im Block.', false],
  ['gruenes-blut', 'Grünes Blut', 'slogan', { a: 'GRÜNES BLUT', b: 'WEISSES HERZ' }, 'einzel', 'kurve', 'Zwei Zeilen, die erklären, warum am Spieltag nichts anderes im Kalender steht.', true],
  ['laut-treu', 'Laut. Treu.', 'balken', { a: 'LAUT. TREU.', b: 'GRÜN-WEISS.' }, 'einzel', 'kurve', 'Drei Worte für 90 Minuten Dauersupport.', false],
  ['32-titel', '32 Titel', 'stempel', { a: '32 TITEL', b: 'REKORDMEISTER AUS WIEN WEST' }, 'einzel', 'kurve', 'Stempel-Design für alle, die die Meistertitel auswendig aufzählen können.', false],
  // PACKS
  ['starter-3er', '3er Starter-Pack', 'pack', { a: 'STARTER-PACK', n: 3 }, 'pack', 'packs', 'Die drei Topseller: Anti Violett, Forza Rapid, Wien West Hütteldorf.', false],
  ['topseller-5er', '5er Topseller-Pack', 'pack', { a: 'TOPSELLER-PACK', n: 5 }, 'pack', 'packs', 'Fünf Lieblinge aus dem Block in einem Kuvert. Genug für Laptop, Flasche, Handy, Spind und einen zum Weitergeben.', true],
  ['mix-10er', '10er Mix-Pack', 'pack', { a: 'MIX-PACK · GRATIS VERSAND', n: 10 }, 'pack', 'packs', 'Zehn verschiedene Motive für die nächste Auswärtsfahrt. Mit 15 € genau an der Gratis-Versand-Grenze.', true],
  ['kurve-25er', '25er Kurven-Pack', 'pack', { a: 'KURVEN-PACK', n: 25 }, 'pack', 'packs', 'Für Fanclubs, Stammtische und alle, die auf dem Weg zum Stadion mehr als einen Laternenmast bekleben.', true],
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
const FORMAT = {
  einzel: 'Ø ca. 8 cm, konturgeschnitten',
  breit: 'ca. 15 × 5 cm, konturgeschnitten',
  pack: 'gemischte Formate (ca. 8 cm)',
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const writeMd = process.argv.includes('--md');
let i = 0;
for (const [slug, name, tpl, data, typ, kategorie, kurz, bestseller] of P) {
  i++;
  const wide = BREIT.has(tpl);
  const vb = wide ? '0 0 900 300' : '0 0 600 600';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${esc(name)}">${T[tpl](data)}</svg>`;
  fs.writeFileSync(path.join(OUT_IMG, `${slug}.svg`), svg);
  await sharp(Buffer.from(svg), { density: 200 })
    .resize(wide ? 1200 : 1000)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_IMG, `${slug}.png`));

  if (!writeMd) continue;
  const isPack = typ === 'pack';
  const [preis, wert, stueck] = isPack ? PACK[slug] : [PREIS[typ], undefined, 1];
  const md = `---
name: ${JSON.stringify(name)}
kurz: ${JSON.stringify(kurz)}
typ: ${typ}
kategorie: ${kategorie}
preis: ${preis}
${wert ? `wertEinzeln: ${wert}\n` : ''}stueck: ${stueck}
format: ${JSON.stringify(FORMAT[typ])}
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
**Format:** ${FORMAT[typ]}.
`;
  fs.writeFileSync(path.join(OUT_MD, `${slug}.md`), md);
}
console.log(`${P.length} Produkte erzeugt${writeMd ? ' (inkl. Markdown)' : ''}.`);
