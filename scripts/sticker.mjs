// Erzeugt die 30 Produkte (Markdown für Astro/Sveltia) + Sticker-Grafiken (SVG + PNG).
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
const W = '#FFFFFF';
const K = '#111111';

/** Text als Pfad, horizontal zentriert, auf maxW skaliert */
function txt(str, cx, baseline, size, maxW, fill) {
  let s = size;
  const w = font.getAdvanceWidth(str, s);
  if (w > maxW) s = (s * maxW) / w;
  const width = font.getAdvanceWidth(str, s);
  const p = font.getPath(str, cx - width / 2, baseline, s);
  return `<path d="${p.toPathData(2)}" fill="${fill}"/>`;
}

// ---------- Vorlagen (viewBox 600×600, Querformate 900×300) ----------
const T = {
  kreis: ({ a, b }) => `
    <circle cx="300" cy="300" r="292" fill="${W}"/>
    <circle cx="300" cy="300" r="270" fill="${G}"/>
    <circle cx="300" cy="300" r="238" fill="none" stroke="${W}" stroke-width="10"/>
    <path d="M110 300h380" stroke="${W}" stroke-width="6" opacity=".35"/>
    ${txt(a, 300, 290, 120, 360, W)}
    ${txt(b, 300, 395, 64, 330, W)}`,
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
    <g clip-path="url(#c)">${Array.from({ length: 9 }, (_, i) =>
      `<rect x="${28 + i * 64}" y="0" width="32" height="600" fill="${G}"/>`).join('')}
    </g>
    <rect x="60" y="190" width="480" height="230" rx="10" fill="${K}"/>
    ${txt(a, 300, 312, 110, 430, W)}
    ${txt(b, 300, 392, 60, 430, '#7BD99B')}`,
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
  auto: ({ a, b }) => `
    <rect x="6" y="6" width="888" height="288" rx="40" fill="${W}"/>
    <rect x="24" y="24" width="852" height="252" rx="26" fill="${G}"/>
    <rect x="24" y="24" width="190" height="252" rx="26" fill="${K}"/>
    <rect x="190" y="24" width="24" height="252" fill="${K}"/>
    ${txt('1899', 119, 172, 70, 150, W)}
    ${txt(a, 545, 140, 76, 600, W)}
    ${txt(b, 545, 235, 76, 600, W)}`,
  pack: ({ a, b, n }) => {
    const mini = (x, y, r, fill, label) => `
      <g transform="translate(${x} ${y}) rotate(${r})">
        <rect x="-110" y="-70" width="220" height="140" rx="18" fill="${W}" stroke="#0002" stroke-width="2"/>
        <rect x="-98" y="-58" width="196" height="116" rx="10" fill="${fill}"/>
        ${txt(label, 0, 18, 46, 170, W)}
      </g>`;
    return `
      <circle cx="300" cy="300" r="292" fill="#EFEDE6"/>
      ${mini(210, 190, -12, G, '1899')}
      ${mini(400, 200, 10, K, 'GRÜN-WEISS')}
      ${mini(190, 380, 8, GD, 'HÜTTELDORF')}
      ${mini(400, 395, -8, G, 'AUSWÄRTS')}
      <circle cx="300" cy="300" r="96" fill="${W}"/>
      <circle cx="300" cy="300" r="84" fill="${K}"/>
      ${txt(String(n), 300, 318, 92, 130, W)}
      ${txt(a, 300, 560, 44, 360, K)}
      ${b ? '' : ''}`;
  },
  mystery: ({ n }) => `
    <circle cx="300" cy="300" r="292" fill="${W}"/>
    <circle cx="300" cy="300" r="272" fill="${K}"/>
    ${txt('?', 300, 360, 300, 200, G)}
    ${txt(`${n} ÜBERRASCHUNGEN`, 300, 470, 48, 360, W)}`,
};

// ---------- Produktdaten ----------
// typ: einzel (Ø ca. 8 cm) | gross (ca. 12 cm) | auto (ca. 20 × 6,5 cm) | pack
const P = [
  // Klassiker
  ['seit-1899', 'Seit 1899', 'kreis', { a: 'SEIT 1899', b: 'GRÜN-WEISS' }, 'einzel', 'klassiker', 'Das Jahr, mit dem alles anfängt. Rund, schlicht, gehört auf jede Tür zwischen Hütteldorf und Auswärtsblock.', true],
  ['gruen-weiss-fuer-immer', 'Grün-Weiß für immer', 'balken', { a: 'GRÜN-WEISS', b: 'FÜR IMMER' }, 'einzel', 'klassiker', 'Schwarz, Grün, Weiß – und eine Ansage, die sich nie ändert. Egal welche Liga, egal welcher Tabellenplatz.', true],
  ['tradition-seit-1899', 'Tradition', 'kreis', { a: 'TRADITION', b: 'SEIT 1899' }, 'einzel', 'klassiker', 'Arbeiterverein statt Event-Klub. Für alle, die wissen, woher der Verein kommt.', false],
  ['gruenes-blut', 'Grünes Blut', 'slogan', { a: 'GRÜNES BLUT', b: 'WEISSES HERZ' }, 'einzel', 'klassiker', 'Zwei Zeilen, die erklären, warum am Spieltag nichts anderes im Kalender steht.', true],
  ['einmal-immer', 'Einmal grün-weiß', 'streifen', { a: 'EINMAL GRÜN-WEISS', b: 'IMMER GRÜN-WEISS' }, 'einzel', 'klassiker', 'Streifen im Vereins-Look und ein Satz ohne Ablaufdatum. Man wird nicht Grün-Weißer, man bleibt es.', false],
  ['laut-treu', 'Laut. Treu.', 'balken', { a: 'LAUT. TREU.', b: 'GRÜN-WEISS.' }, 'einzel', 'klassiker', 'Drei Worte für 90 Minuten Dauersupport. Starker Kontrast, auch vom anderen Ende des Bahnsteigs lesbar.', false],
  ['32-titel', '32 Titel', 'stempel', { a: '32 TITEL', b: 'REKORDMEISTER AUS WIEN' }, 'einzel', 'klassiker', 'Stempel-Design für alle, die die Meistertitel auswendig aufzählen können – und auf den nächsten warten.', true],
  // Hütteldorf & Stadion
  ['huetteldorf-ist-ueberall', 'Hütteldorf ist überall', 'streifen', { a: 'HÜTTELDORF', b: 'IST ÜBERALL' }, 'einzel', 'huetteldorf', 'Laternenmast in Graz, Bahnhof in Salzburg, Raststation irgendwo: Hütteldorf ist dort, wo wir hinfahren.', true],
  ['1140', '1140 Hütteldorf', 'kreis', { a: '1140', b: 'HÜTTELDORF' }, 'einzel', 'huetteldorf', 'Die Postleitzahl, die jeder im Block im Schlaf kennt. Für alle, deren Herz im 14. schlägt.', false],
  ['westtribuene', 'Westtribüne', 'stempel', { a: 'WESTTRIBÜNE', b: 'STEHPLATZ STATT SITZPLATZ' }, 'einzel', 'huetteldorf', 'Für alle, die 90 Minuten stehen, singen und springen – und keinen Sitzplatz brauchen.', true],
  ['st-hanappi', 'St. Hanappi', 'stempel', { a: 'ST. HANAPPI', b: 'FÜR IMMER IN UNS' }, 'einzel', 'huetteldorf', 'Für alle, die noch im alten Hanappi gestanden sind. Das Stadion ist weg, die Erinnerung bleibt.', false],
  ['heimspiel', 'Heimspiel ist heilig', 'slogan', { a: 'HEIMSPIEL', b: 'IST HEILIG' }, 'einzel', 'huetteldorf', 'Hochzeit verschieben? Vielleicht. Heimspiel auslassen? Sicher nicht.', false],
  ['viertelstunde', '75. Minute', 'kreis', { a: '75. MINUTE', b: 'JETZT WIRD GEKLATSCHT' }, 'einzel', 'huetteldorf', 'Wenn in der 75. Minute das ganze Stadion klatscht. Die Tradition, die es so nur in Hütteldorf gibt.', true],
  // Wien & Derby
  ['wien-ist-gruen-weiss', 'Wien ist grün-weiß', 'slogan', { a: 'WIEN IST', b: 'GRÜN-WEISS' }, 'einzel', 'wien', 'Eine Stadt, zwei Farben. Mehr gibt es dazu nicht zu sagen.', true],
  ['derbysieger', 'Derbysieger', 'balken', { a: 'DERBYSIEGER', b: 'WIEN BLEIBT GRÜN' }, 'einzel', 'wien', 'Für den Montag nach dem Derby – und für alle Tage, an denen man daran erinnern muss.', true],
  ['violett-nein-danke', 'Violett? Nein, danke.', 'stempel', { a: 'VIOLETT?', b: 'NEIN, DANKE.' }, 'einzel', 'wien', 'Freundlich, aber bestimmt. Derby-Schmäh für den Spind, den Laptop oder die Bürotür.', true],
  ['schmaeh', 'Grün-Weiß mit Schmäh', 'kreis', { a: 'GRÜN-WEISS', b: 'MIT SCHMÄH' }, 'einzel', 'wien', 'Wienerisch durch und durch: ernst bei der Sache, nie ohne Schmäh.', false],
  ['auswaerts', 'Auswärts immer dabei', 'stempel', { a: 'AUSWÄRTS', b: 'IMMER DABEI' }, 'einzel', 'wien', 'Für alle, die im Bus, im Zug oder im Auto jedes Auswärtsspiel mitnehmen. Egal wie weit, egal wie kalt.', false],
  // Groß
  ['unser-verein-gross', 'Unser Verein, unsere Stadt (groß)', 'balken', { a: 'UNSER VEREIN', b: 'UNSERE STADT' }, 'gross', 'gross', 'Großformat für Kühlschrank, Koffer oder Proberaum. Weil der Verein den Fans gehört.', false],
  ['block-west-gross', 'Block West (groß)', 'stempel', { a: 'BLOCK WEST', b: 'STEHT. IMMER.' }, 'gross', 'gross', 'Der Name sagt alles. Großformat, damit es jeder sieht.', true],
  ['huetteldorfer-gross', 'Hütteldorfer Buam & Madln (groß)', 'slogan', { a: 'HÜTTELDORFER', b: 'BUAM & MADLN' }, 'gross', 'gross', 'Für die ganze Familie im Block – von den Jüngsten bis zu denen, die schon auf der Pfarrwiese waren.', false],
  ['seit-1899-gross', 'Seit 1899 (groß)', 'kreis', { a: 'SEIT 1899', b: 'GRÜN-WEISS' }, 'gross', 'gross', 'Der Klassiker im Großformat – für den Laptop-Deckel, der zum Auswärtsspiel mitfährt.', false],
  // Auto
  ['auto-an-bord', 'Autosticker „An Bord“', 'auto', { a: 'AN BORD:', b: 'EIN GRÜN-WEISSER' }, 'auto', 'auto', 'Für Heckscheibe oder Stoßstange. Damit jeder auf der Autobahn weiß, wohin die Reise geht.', true],
  ['auto-bremsen', 'Autosticker „Ich bremse“', 'auto', { a: 'ICH BREMSE NUR', b: 'FÜR GRÜN-WEISS' }, 'auto', 'auto', 'Der Klassiker unter den Heck-Stickern, in Grün-Weiß neu interpretiert.', false],
  // Packs
  ['starter-3er', '3er Starter-Pack', 'pack', { a: 'STARTER-PACK', n: 3 }, 'pack', 'packs', 'Drei Klassiker zum Einstieg: Seit 1899, Grün-Weiß für immer, Hütteldorf ist überall.', false],
  ['klassiker-5er', '5er Klassiker-Pack', 'pack', { a: 'KLASSIKER-PACK', n: 5 }, 'pack', 'packs', 'Fünf Lieblinge aus dem Block in einem Kuvert. Genug für Laptop, Flasche, Handy, Spind und einen zum Weitergeben.', true],
  ['mix-10er', '10er Mix-Pack', 'pack', { a: 'MIX-PACK · GRATIS VERSAND', n: 10 }, 'pack', 'packs', 'Zehn verschiedene Motive für die nächste Auswärtsfahrt. Mit 15 € genau an der Gratis-Versand-Grenze.', true],
  ['kurve-25er', '25er Kurven-Pack', 'pack', { a: 'KURVEN-PACK', n: 25 }, 'pack', 'packs', 'Für Fanclubs, Stammtische und alle, die auf dem Weg zum Stadion mehr als einen Laternenmast bekleben.', true],
  ['block-50er', '50er Block-Pack', 'pack', { a: 'BLOCK-PACK', n: 50 }, 'pack', 'packs', '50 Sticker, alle 18 Klassik-Motive gemischt. Bester Stückpreis – zum Aufteilen in der Gruppe.', false],
  ['mystery-15er', 'Mystery-Pack (15 Stück)', 'mystery', { n: 15 }, 'pack', 'packs', '15 Sticker, zufällig gezogen. Mit Sondermotiven, die es einzeln nicht gibt.', false],
];

const PREIS = { einzel: 2.5, gross: 3.9, auto: 5.9 };
const PACK = {
  'starter-3er': [6.9, 7.5, 3],
  'klassiker-5er': [9.9, 12.5, 5],
  'mix-10er': [15, 25, 10],
  'kurve-25er': [29, 62.5, 25],
  'block-50er': [49, 125, 50],
  'mystery-15er': [19, 37.5, 15],
};
const FORMAT = {
  einzel: 'Ø ca. 8 cm, konturgeschnitten',
  gross: 'ca. 12 cm, konturgeschnitten',
  auto: 'ca. 20 × 6,5 cm',
  pack: 'gemischte Formate (ca. 8 cm)',
};

const writeMd = process.argv.includes('--md');
let i = 0;
for (const [slug, name, tpl, data, typ, kategorie, kurz, bestseller] of P) {
  i++;
  const wide = tpl === 'auto';
  const vb = wide ? '0 0 900 300' : '0 0 600 600';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${name.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}">${T[tpl](data)}</svg>`;
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
console.log(`${P.length} Sticker erzeugt${writeMd ? ' (inkl. Markdown)' : ''}.`);
