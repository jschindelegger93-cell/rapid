import settings from '../data/settings.json';
export const S = settings;
export const KATEGORIEN = {
  klassiker: 'Klassiker',
  huetteldorf: 'Hütteldorf & Stadion',
  wien: 'Wien & Derby',
  gross: 'Großformat',
  auto: 'Auto',
  packs: 'Packs',
} as const;
export const eur = (n: number) =>
  new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(n);
