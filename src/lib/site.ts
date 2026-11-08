import settings from '../data/settings.json';
export const S = settings;
export const KATEGORIEN = {
  derby: 'Anti Violett & Derby',
  forza: 'Forza Rapid',
  wienwest: 'Wien West & Hütteldorf',
  kurve: 'Kurve & Auswärts',
  packs: 'Packs',
} as const;
export const eur = (n: number) =>
  new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(n);
