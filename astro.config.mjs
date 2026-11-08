// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// [PLATZHALTER] Live-Domain eintragen
export default defineConfig({
  site: 'https://kleberei1899.at',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  integrations: [
    sitemap({
      filter: (page) => !/\/(danke|admin|warenkorb|impressum|datenschutz|agb)\//.test(page),
      i18n: { defaultLocale: 'de', locales: { de: 'de-AT' } },
    }),
  ],
});
