/* Wien West Sticker – Warenkorb-Drawer (AJAX Cart API + Section Rendering), Menü, Ankündigung, Tracking-Hooks */
(() => {
  const W = window.WW || {};
  const $ = (s, r = document) => r.querySelector(s);
  const drawer = () => $('#drawer');
  let lastFocus = null;

  const toast = (msg) => {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200);
  };
  const track = (event, data = {}) => { (window.dataLayer = window.dataLayer || []).push({ event, ...data }); };

  async function refresh(html) {
    if (!html) {
      const r = await fetch(`${W.routes.root.replace(/\/$/, '')}/?sections=cart-drawer`);
      html = (await r.json())['cart-drawer'];
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const open = drawer()?.classList.contains('open');
    const fresh = doc.querySelector('#drawer');
    if (fresh && drawer()) { drawer().replaceWith(fresh); if (open) fresh.classList.add('open'); }
    const n = doc.querySelector('[data-count-src]')?.textContent.trim() || '0';
    document.querySelectorAll('[data-cart-count]').forEach((el) => (el.textContent = n === '0' ? '' : n));
    if (document.body.classList.contains('t-cart')) location.reload();
  }

  async function add(id, quantity = 1, title = '') {
    const r = await fetch(`${W.routes.add}.js`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items: [{ id: Number(id), quantity: Number(quantity) }], sections: 'cart-drawer' }),
    });
    const data = await r.json();
    if (!r.ok) { toast(data.description || W.t.error); return; }
    await refresh(data.sections?.['cart-drawer']);
    const item = data.items?.[0];
    toast(`${item?.product_title || title} ${W.t.added}`);
    track('add_to_cart', { ecommerce: { currency: 'EUR', value: (item?.final_line_price || 0) / 100, items: [{ item_id: item?.sku, item_name: item?.product_title, price: (item?.final_price || 0) / 100, quantity }] } });
    if (W.drawer) openDrawer();
  }

  async function change(line, quantity) {
    const r = await fetch(`${W.routes.change}.js`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ line: Number(line), quantity: Math.max(0, Number(quantity)), sections: 'cart-drawer' }),
    });
    const data = await r.json();
    if (!r.ok) { toast(data.description || W.t.error); return; }
    await refresh(data.sections?.['cart-drawer']);
  }

  function openDrawer() {
    const d = drawer(); if (!d) return;
    lastFocus = document.activeElement;
    d.classList.add('open'); document.body.style.overflow = 'hidden';
    d.querySelector('.x')?.focus();
    track('view_cart');
  }
  function closeDrawer() {
    drawer()?.classList.remove('open'); document.body.style.overflow = '';
    lastFocus?.focus?.();
  }

  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-add-form]');
    if (!f) return;
    e.preventDefault();
    const fd = new FormData(f);
    const btn = f.querySelector('[type=submit]');
    btn?.classList.add('ok'); setTimeout(() => btn?.classList.remove('ok'), 900);
    add(fd.get('id'), fd.get('quantity') || 1);
  });

  document.addEventListener('click', (e) => {
    const t = e.target;
    const v = t.closest('[data-variant]');
    if (v) { e.preventDefault(); add(v.dataset.variant, 1); return; }
    const q = t.closest('[data-line]');
    if (q) { e.preventDefault(); change(q.dataset.line, q.dataset.qty); return; }
    if (t.closest('[data-open-cart]') && !document.body.classList.contains('t-cart')) { e.preventDefault(); openDrawer(); return; }
    if (t.closest('[data-close-cart]')) { closeDrawer(); return; }
    if (t.closest('[data-cookie-prefs]')) {
      e.preventDefault();
      if (window.privacyBanner?.showPreferences) window.privacyBanner.showPreferences();
      else if (window.Shopify?.customerPrivacy) location.hash = 'cookie-preferences';
      return;
    }
    if (t.closest('[name=checkout]')) track('begin_checkout');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer()?.classList.contains('open')) closeDrawer(); });

  // Burger
  const b = $('#burger'), n = $('#nav');
  b?.addEventListener('click', () => {
    const o = n.classList.toggle('open');
    b.setAttribute('aria-expanded', String(o));
    document.body.style.overflow = o ? 'hidden' : '';
  });
  const closeNav = () => { n?.classList.remove('open'); b?.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };
  n?.addEventListener('click', (e) => { if (e.target.closest('a')) closeNav(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && n?.classList.contains('open')) closeNav(); });
  matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) closeNav(); });

  // Ankündigung rotieren
  const spans = document.querySelectorAll('.ann span');
  if (spans.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let i = 0;
    setInterval(() => { spans[i].classList.remove('on'); i = (i + 1) % spans.length; spans[i].classList.add('on'); }, 5000);
  }

  // Einblenden
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && (x.target.classList.add('in'), io.unobserve(x.target))), { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.fade').forEach((el) => io.observe(el));
  } else document.querySelectorAll('.fade').forEach((el) => el.classList.add('in'));

  // Produktseite: Menge
  document.querySelectorAll('[data-qty-step]').forEach((btn) => btn.addEventListener('click', () => {
    const inp = btn.parentElement.querySelector('input');
    inp.value = Math.max(1, (parseInt(inp.value) || 1) + Number(btn.dataset.qtyStep));
  }));
  W.refreshCart = refresh; W.openDrawer = openDrawer; W.toast = toast; W.track = track;
})();
