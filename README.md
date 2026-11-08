# Kleberei 1899 – Grün-Weiß Sticker-Shop

Astro (statisch) + Sveltia CMS + Netlify. Gebaut nach dem MASTER WEB PROMPT (CMS-Version).

## Start in 5 Schritten
1. `npm install`
2. `npm run dev` → http://localhost:4321
3. Netlify → „Add new site“ → „Import from Git“ → Repo `rapid` (Build `npm run build`, Publish `dist` – steht in `netlify.toml`)
4. CMS: `deinedomain.at/admin` → mit GitHub anmelden → Sticker, Preise, Versandregeln bearbeiten
5. Go-live: in `src/data/settings.json` `"klickdummy": false` und in `public/robots.txt` `Disallow: /` entfernen

## Shop-Logik
- 30 Produkte in `src/content/sticker/*.md` (24 Motive + 6 Packs)
- Warenkorb (`src/scripts/cart.ts`): localStorage, Mindestbestellwert 10 €, Gratis-Versand ab 15 €, Staffelrabatt 5+/10+, Upsell
- Checkout:
  - **ohne Shopify** (Standard): Bestellformular `/warenkorb/` über Netlify Forms → du schickst Zahlungslink (PayPal/Überweisung)
  - **mit Shopify**: `shopifyDomain` in den Einstellungen + `shopifyVariantId` je Produkt → Warenkorb springt direkt in den Shopify-Checkout. Staffelrabatt in Shopify als automatischen Mengenrabatt anlegen, Versandregeln (2,90 €, gratis ab 15 €, MBW 10 €) dort ebenfalls.
- Tracking: `add_to_cart`, `view_cart`, `begin_checkout`, `purchase` → `dataLayer` (GTM andocken)

## Sticker-Grafiken
`npm run sticker` erzeugt alle Motive neu (SVG + PNG in `public/sticker/`). Eigene Designs einfach im CMS hochladen.
Eigene Designs – **keine** Vereins- oder Fangruppen-Logos (siehe `docs/fanszene-recherche.md`).

## Dokumente
- `docs/kalkulation.md` – Preise, Stückkosten, Deckungsbeitrag, Break-even
- `docs/fanszene-recherche.md` – Fanclubs/Gruppen & was das für den Shop bedeutet

## Offene Platzhalter
Impressum/UID, Datenschutz, AGB, Druckerei-Angaben zur Haltbarkeit, Domain (`astro.config.mjs`).
