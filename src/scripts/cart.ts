// Warenkorb: localStorage, Staffelrabatt, Mindestbestellwert, Gratis-Versand-Balken, Upsell, Checkout
type Item = { slug: string; name: string; preis: number; typ: string; bild: string; url: string; variant?: string; stueck: number };
type Cfg = { mindestbestellwert: number; gratisVersandAb: number; versandAT: number; staffel: { ab: number; rabatt: number }[]; shopifyDomain: string };

const data = JSON.parse(document.getElementById('katalog')!.textContent!);
const K: Record<string, Item> = Object.fromEntries((data.items as Item[]).map((i) => [i.slug, i]));
const C: Cfg = data.cfg;
const KEY = 'wienwest-cart-v1';
const eur = (n: number) => new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(n);

let cart: Record<string, number> = {};
try { cart = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { cart = {}; }
for (const s of Object.keys(cart)) if (!K[s] || cart[s] < 1) delete cart[s];

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} };

export function berechne() {
  const zeilen = Object.entries(cart).map(([slug, qty]) => ({ ...K[slug], qty, summe: K[slug].preis * qty }));
  const einzelStk = zeilen.filter((z) => z.typ !== 'pack').reduce((a, z) => a + z.qty, 0);
  const einzelSumme = zeilen.filter((z) => z.typ !== 'pack').reduce((a, z) => a + z.summe, 0);
  const stufe = [...C.staffel].reverse().find((s) => einzelStk >= s.ab);
  const rabatt = stufe ? Math.round(einzelSumme * stufe.rabatt) / 100 : 0;
  const brutto = zeilen.reduce((a, z) => a + z.summe, 0);
  const zwischen = Math.round((brutto - rabatt) * 100) / 100;
  const versand = zwischen === 0 || zwischen >= C.gratisVersandAb ? 0 : C.versandAT;
  const naechste = C.staffel.find((s) => einzelStk < s.ab);
  return {
    zeilen, einzelStk, stufe, naechste, rabatt, brutto, zwischen, versand,
    total: zwischen + versand,
    stueck: zeilen.reduce((a, z) => a + z.qty * z.stueck, 0),
    fehltMBW: Math.max(0, C.mindestbestellwert - zwischen),
    fehltGratis: Math.max(0, C.gratisVersandAb - zwischen),
  };
}

function track(ev: string, d: object = {}) {
  // GA4 / Meta Pixel andocken: window.dataLayer?.push({ event: ev, ...d })
  (window as any).dataLayer?.push({ event: ev, ...d });
}

export function add(slug: string, qty = 1) {
  cart[slug] = (cart[slug] || 0) + qty;
  save(); render();
  toast(`${K[slug].name} im Warenkorb`);
  track('add_to_cart', { item_id: slug, value: K[slug].preis * qty, currency: 'EUR' });
}
function setQty(slug: string, qty: number) {
  if (qty < 1) delete cart[slug]; else cart[slug] = qty;
  save(); render();
}

let tt: number;
function toast(msg: string) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('on');
  clearTimeout(tt); tt = window.setTimeout(() => t.classList.remove('on'), 2200);
}

function versandHtml(r: ReturnType<typeof berechne>) {
  const pct = Math.min(100, (r.zwischen / C.gratisVersandAb) * 100);
  const txt = r.zwischen === 0
    ? `Gratis Versand ab ${eur(C.gratisVersandAb)}`
    : r.fehltGratis > 0
      ? `Noch <b>${eur(r.fehltGratis)}</b> bis zum Gratis-Versand`
      : `✓ Du hast <b>Gratis-Versand</b>`;
  return `<div class="ship">${txt}<div class="ship-bar"><i style="width:${pct}%"></i></div></div>`;
}

function upsellHtml(r: ReturnType<typeof berechne>) {
  if (r.zwischen === 0 || (r.fehltGratis <= 0 && !r.naechste)) return '';
  // Vorschläge: Bestseller-Einzelsticker, die noch nicht im Korb sind
  const pool = (data.items as Item[]).filter((i) => i.typ === 'einzel' && !cart[i.slug] && data.bestseller.includes(i.slug)).slice(0, 6);
  if (!pool.length) return '';
  let msg = '';
  if (r.naechste) {
    const fehlt = r.naechste.ab - r.einzelStk;
    msg = `Noch <b>${fehlt} Sticker</b> bis −${r.naechste.rabatt} % auf alle Einzelsticker`;
  } else msg = 'Dazu passt:';
  return `<p class="ship" style="margin:14px 0 4px">${msg}</p><div class="upsell">${pool
    .map((p) => `<button type="button" data-add="${p.slug}"><img src="${p.bild}" alt="" width="94" height="94" loading="lazy">${p.name}<br><b>+ ${eur(p.preis)}</b></button>`)
    .join('')}</div>`;
}

export function render() {
  const r = berechne();
  document.querySelectorAll<HTMLElement>('[data-cart-count]').forEach((el) => (el.textContent = r.zeilen.length ? String(r.zeilen.reduce((a, z) => a + z.qty, 0)) : ''));
  document.querySelectorAll<HTMLElement>('[data-ship]').forEach((el) => (el.innerHTML = versandHtml(r)));

  const body = document.getElementById('cart-body');
  const foot = document.getElementById('cart-foot');
  if (body && foot) {
    if (!r.zeilen.length) {
      body.innerHTML = `${versandHtml(r)}<div class="empty"><p>Dein Warenkorb ist leer.</p><a class="btn btn--g" href="/sticker/">Sticker ansehen</a></div>`;
      foot.hidden = true;
    } else {
      foot.hidden = false;
      body.innerHTML = versandHtml(r) + r.zeilen.map((z) => `
        <div class="line">
          <img src="${z.bild}" alt="" width="64" height="64">
          <div><a class="t" href="${z.url}">${z.name}</a><div class="s">${eur(z.preis)}${z.stueck > 1 ? ` · ${z.stueck} Stk.` : ''}</div>
            <div class="qty"><button type="button" data-q="${z.slug}" data-d="-1" aria-label="Weniger">−</button><span>${z.qty}</span><button type="button" data-q="${z.slug}" data-d="1" aria-label="Mehr">+</button></div>
          </div>
          <b>${eur(z.summe)}</b>
        </div>`).join('') + upsellHtml(r);
      foot.innerHTML = `
        <div class="sum"><span>Zwischensumme</span><span>${eur(r.brutto)}</span></div>
        ${r.rabatt ? `<div class="sum green"><span>Mengenrabatt −${r.stufe!.rabatt} %</span><span>−${eur(r.rabatt)}</span></div>` : ''}
        <div class="sum"><span>Versand (AT)</span><span>${r.versand ? eur(r.versand) : 'gratis'}</span></div>
        <div class="sum total"><span>Gesamt</span><span>${eur(r.total)}</span></div>
        <small style="color:var(--muted)">inkl. USt. · Versand nach DE/EU wird an der Kasse berechnet</small>
        ${r.fehltMBW > 0 ? `<div class="hint warn">Mindestbestellwert ${eur(C.mindestbestellwert)} – noch <b>${eur(r.fehltMBW)}</b>.</div>` : ''}
        <button class="btn btn--g" type="button" data-checkout ${r.fehltMBW > 0 ? 'disabled' : ''}>Zur Kasse · ${eur(r.total)}</button>`;
    }
  }
  document.dispatchEvent(new CustomEvent('cart:change', { detail: r }));
}

function checkout() {
  const r = berechne();
  if (r.fehltMBW > 0) return;
  track('begin_checkout', { value: r.total, currency: 'EUR' });
  const alleMitVariant = r.zeilen.every((z) => z.variant);
  if (C.shopifyDomain && alleMitVariant) {
    // Shopify-Cart-Permalink. Staffelrabatt in Shopify als automatischen Rabatt anlegen (siehe README).
    const items = r.zeilen.map((z) => `${z.variant}:${z.qty}`).join(',');
    location.href = `https://${C.shopifyDomain}/cart/${items}`;
  } else {
    location.href = '/warenkorb/';
  }
}

// Drawer
const drawer = document.getElementById('drawer');
let lastFocus: HTMLElement | null = null;
function openDrawer() {
  if (!drawer) return;
  lastFocus = document.activeElement as HTMLElement;
  drawer.classList.add('open'); document.body.style.overflow = 'hidden';
  (drawer.querySelector('.x') as HTMLElement)?.focus();
  track('view_cart');
}
function closeDrawer() {
  drawer?.classList.remove('open'); document.body.style.overflow = '';
  lastFocus?.focus();
}

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const a = t.closest<HTMLElement>('[data-add]');
  if (a) {
    e.preventDefault();
    const qtyEl = document.getElementById('qty-input') as HTMLInputElement | null;
    const q = a.hasAttribute('data-use-qty') && qtyEl ? Math.max(1, parseInt(qtyEl.value) || 1) : 1;
    add(a.dataset.add!, q);
    a.classList.add('ok'); setTimeout(() => a.classList.remove('ok'), 900);
    if (a.hasAttribute('data-open')) openDrawer();
    return;
  }
  const q = t.closest<HTMLElement>('[data-q]');
  if (q) { setQty(q.dataset.q!, (cart[q.dataset.q!] || 0) + Number(q.dataset.d)); return; }
  if (t.closest('[data-open-cart]')) { e.preventDefault(); openDrawer(); return; }
  if (t.closest('[data-close-cart]')) { closeDrawer(); return; }
  if (t.closest('[data-checkout]')) { checkout(); return; }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer?.classList.contains('open')) closeDrawer(); });

export function leeren() { cart = {}; save(); render(); }
export const katalog = K;
(window as any).wienwest = { berechne, leeren, add, render };
render();
