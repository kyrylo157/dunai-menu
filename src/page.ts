import { photoUrl, priceText, type Category, type Item, type Section, type Settings } from './db';

const h = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SECTIONS: [Section, string][] = [['kitchen', 'Кухня'], ['bar', 'Бар']];
const BADGE: Record<string, string> = { hit: 'Хіт', new: 'Новинка' };

function badge(it: Item) {
  return it.badge && BADGE[it.badge] ? `<span class="badge">${BADGE[it.badge]}</span>` : '';
}

function tapAttrs(it: Item) {
  return it.photo || it.description ? ` data-id="${it.id}"` : '';
}

function card(it: Item) {
  const src = photoUrl(it.photo)!;
  return `<li><button class="card" type="button"${tapAttrs(it)}>
  <span class="card-img"><img src="${h(src)}" alt="" loading="lazy" decoding="async" width="400" height="400">${badge(it)}</span>
  <span class="card-name">${h(it.name)}</span>
  ${it.description ? `<span class="card-desc">${h(it.description)}</span>` : ''}
  <span class="card-foot"><span class="weight">${h(it.weight)}</span><span class="price">${priceText(it.price)}</span></span>
</button></li>`;
}

function row(it: Item, withThumb: boolean) {
  const src = photoUrl(it.photo);
  const tag = it.photo || it.description ? 'button type="button"' : 'div';
  const close = tag === 'div' ? 'div' : 'button';
  const thumb = withThumb
    ? `<span class="thumb">${src ? `<img src="${h(src)}" alt="" loading="lazy" decoding="async" width="56" height="56">` : ''}</span>`
    : '';
  return `<li><${tag} class="row"${tapAttrs(it)}>${thumb}
  <span class="row-main">
    <span class="row-line"><span class="row-name">${h(it.name)}${badge(it)}</span><span class="leader" aria-hidden="true"></span><span class="price">${priceText(it.price)}</span></span>
    ${it.weight || it.description ? `<span class="row-sub">${[it.weight, it.description].filter(Boolean).map(h).join('. ')}</span>` : ''}
  </span>
</${close}></li>`;
}

function categoryBlock(c: Category, list: Item[]) {
  let body: string;
  if (c.layout === 'cards') {
    const withPhoto = list.filter((i) => i.photo);
    const without = list.filter((i) => !i.photo);
    body = (withPhoto.length ? `<ul class="cards">${withPhoto.map(card).join('')}</ul>` : '')
      + (without.length ? `<ul class="rows">${without.map((i) => row(i, false)).join('')}</ul>` : '');
  } else {
    const thumbs = list.some((i) => i.photo);
    body = `<ul class="rows${thumbs ? ' with-thumbs' : ''}">${list.map((i) => row(i, thumbs)).join('')}</ul>`;
  }
  return `<section class="cat" id="c${c.id}" aria-labelledby="c${c.id}-t">
  <h2 class="cat-title" id="c${c.id}-t">${h(c.name)}</h2>
  ${body}
</section>`;
}

export function renderMenu(s: Settings, cats: Category[], all: Item[]): string {
  const visible = all.filter((i) => !i.hidden);
  const byCat = new Map<number, Item[]>();
  for (const it of visible) {
    if (!byCat.has(it.category_id)) byCat.set(it.category_id, []);
    byCat.get(it.category_id)!.push(it);
  }
  const shown = cats.filter((c) => !c.hidden && byCat.get(c.id)?.length);
  const present = SECTIONS.filter(([sec]) => shown.some((c) => c.section === sec));

  const sheetData: Record<number, { n: string; p: string; w: string | null; d: string | null; i: string | null }> = {};
  for (const it of visible) {
    if (it.photo || it.description) {
      sheetData[it.id] = { n: it.name, p: priceText(it.price), w: it.weight, d: it.description, i: photoUrl(it.photo) };
    }
  }

  const name = s.name || 'Dynai';
  const logo = photoUrl(s.logo ?? null);

  const tabs = present.length > 1
    ? `<div class="tabs" role="tablist">${present.map(([sec, label], i) =>
        `<a class="tab" role="tab" href="#${sec}" data-tab="${sec}" aria-selected="${i === 0}">${label}</a>`).join('')}</div>`
    : '';

  const chips = present.map(([sec]) =>
    `<div class="chips" data-chips="${sec}">${shown.filter((c) => c.section === sec)
      .map((c) => `<a class="chip" href="#c${c.id}">${h(c.name)}</a>`).join('')}</div>`).join('');

  const sections = present.map(([sec, label]) =>
    `<div class="section" id="${sec}" data-section="${sec}">
  <h2 class="visually-hidden">${label}</h2>
  ${shown.filter((c) => c.section === sec).map((c) => categoryBlock(c, byCat.get(c.id)!)).join('\n')}
</div>`).join('\n');

  const insta = s.instagram
    ? `<a class="insta" href="${h(s.instagram)}" target="_blank" rel="noopener">
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>
  <span>Ми в Instagram</span></a>`
    : '';

  return `<!doctype html>
<html lang="uk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Меню — ${h(name)}</title>
<meta name="description" content="${h([s.tagline, s.hours].filter(Boolean).join('. '))}">
<meta property="og:title" content="Меню ресторану ${h(name)}">
<meta property="og:description" content="${h(s.tagline)}">
${logo ? `<meta property="og:image" content="${h(logo)}"><link rel="icon" href="${h(logo)}">` : ''}
<meta name="theme-color" content="#FBFAF7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#141719" media="(prefers-color-scheme: dark)">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Commissioner:wght@400;500;600&family=Marck+Script&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header class="hero">
  ${logo ? `<img class="logo" src="${h(logo)}" alt="${h(name)} family restaurant" width="200" height="200">` : `<p class="logo-text">${h(name)}</p>`}
  <h1 class="visually-hidden">Меню ресторану ${h(name)}</h1>
  ${s.tagline ? `<p class="tagline">${h(s.tagline)}</p>` : ''}
  ${s.hours ? `<p class="hours">${h(s.hours)}</p>` : ''}
  ${insta}
</header>

<nav class="bar" aria-label="Розділи меню">
  ${tabs}
  ${chips}
</nav>

<main>
${sections || '<p class="empty">Меню оновлюється. Загляньте трохи пізніше.</p>'}
</main>

<footer class="foot">
  <p>Ціни вказані в гривнях.</p>
  ${insta}
</footer>

<dialog class="sheet" id="sheet" aria-labelledby="sheet-name">
  <form method="dialog"><button class="sheet-close" aria-label="Закрити">
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
  </button></form>
  <img class="sheet-img" alt="" hidden>
  <div class="sheet-body">
    <h3 class="sheet-name" id="sheet-name"></h3>
    <p class="sheet-desc"></p>
    <p class="sheet-foot"><span class="weight"></span><span class="price"></span></p>
  </div>
</dialog>

<script>window.MENU=${JSON.stringify(sheetData).replace(/</g, '\\u003c')};</script>
<script>${JS}</script>
</body>
</html>`;
}

const CSS = /* css */ `
:root {
  --paper: #FBFAF7;
  --ink: #1E1C19;
  --muted: #7A746C;
  --line: #E5E1DA;
  --river: #2D5D6C;
  --river-soft: #E3ECEE;
  --surface: #FFFFFF;
  --script: 'Marck Script', cursive;
  --sans: 'Commissioner', system-ui, sans-serif;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --paper: #141719;
    --ink: #ECE8E1;
    --muted: #9B958C;
    --line: #2A2F32;
    --river: #8FBBC8;
    --river-soft: #1E2D32;
    --surface: #1B1F22;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 116px; -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--paper); color: var(--ink);
  font: 400 16px/1.45 var(--sans);
  -webkit-font-smoothing: antialiased;
}
img { display: block; max-width: 100%; }
button { font: inherit; color: inherit; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--river); outline-offset: 3px; border-radius: 6px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* hero: the logo is the identity, everything else stays quiet */
.hero {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 40px 16px 28px; gap: 6px;
}
.logo { width: 176px; height: 176px; border-radius: 50%; mix-blend-mode: multiply; margin-bottom: 14px; }
/* the logo is black on white: invert it and let the black drop out on dark paper */
@media (prefers-color-scheme: dark) { .logo { filter: invert(1); mix-blend-mode: screen; } }
.logo-text { font: 72px/1 var(--script); margin: 0 0 12px; }
.tagline { margin: 0; font-size: 17px; font-weight: 500; }
.hours { margin: 0; color: var(--muted); font-size: 15px; }
.insta {
  display: inline-flex; align-items: center; gap: 8px; margin-top: 16px;
  padding: 10px 18px; border-radius: 999px; text-decoration: none;
  border: 1px solid var(--ink); font-weight: 500; font-size: 15px;
}
.insta:hover { background: var(--ink); color: var(--paper); }

/* sticky navigation */
.bar {
  position: sticky; top: 0; z-index: 5;
  background: color-mix(in srgb, var(--paper) 92%, transparent);
  backdrop-filter: saturate(1.4) blur(12px); -webkit-backdrop-filter: saturate(1.4) blur(12px);
  border-bottom: 1px solid var(--line);
}
.tabs { display: flex; justify-content: center; gap: 28px; padding: 10px 16px 0; }
.tab {
  font: 34px/1.1 var(--script); text-decoration: none; color: var(--muted);
  padding: 0 4px 4px; border-bottom: 2px solid transparent;
}
.tab[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--river); }
.chips {
  display: flex; gap: 6px; overflow-x: auto; padding: 10px 16px 12px;
  scrollbar-width: none; scroll-snap-type: x proximity; scroll-padding-inline: 16px;
}
.chips::-webkit-scrollbar { display: none; }
.chip {
  flex: none; scroll-snap-align: start; text-decoration: none; white-space: nowrap;
  font-size: 14px; font-weight: 500; padding: 7px 13px; border-radius: 999px;
  color: var(--muted); background: transparent; border: 1px solid var(--line);
}
.chip.on { color: var(--river); background: var(--river-soft); border-color: transparent; }
.js [data-chips]:not(.on), .js .section:not(.on) { display: none; }

main { max-width: 760px; margin: 0 auto; padding: 8px 16px 24px; }
.cat { padding-top: 28px; }
.cat-title {
  font: 46px/1.05 var(--script); font-weight: 400; margin: 0 0 16px;
  letter-spacing: 0.005em;
}

/* photo cards */
.cards { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 14px; }
@media (min-width: 640px) { .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.card {
  all: unset; box-sizing: border-box; display: flex; flex-direction: column; gap: 4px; width: 100%;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.card:not([data-id]) { cursor: default; }
.card-img { position: relative; aspect-ratio: 1; border-radius: 16px; overflow: hidden; background: var(--line); margin-bottom: 6px; }
.card-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s ease; }
.card[data-id]:active .card-img img { transform: scale(.97); }
.card-img .badge { position: absolute; left: 8px; top: 8px; margin: 0; }
.card-name { font-weight: 500; font-size: 15.5px; line-height: 1.3; }
.card-desc {
  color: var(--muted); font-size: 13.5px; line-height: 1.35;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-foot { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-top: auto; padding-top: 2px; }
.weight { color: var(--muted); font-size: 13.5px; }
.price { font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }

/* rows with dotted leaders, like a printed menu */
.rows { list-style: none; margin: 0; padding: 0; }
.cards + .rows { margin-top: 18px; }
.row {
  all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 11px 0; border-bottom: 1px solid var(--line); -webkit-tap-highlight-color: transparent;
}
button.row { cursor: pointer; }
li:last-child > .row { border-bottom: 0; }
.thumb { flex: none; width: 52px; height: 52px; border-radius: 12px; overflow: hidden; background: var(--line); }
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb:empty { background: transparent; }
.row-main { flex: 1; min-width: 0; }
.row-line { display: flex; align-items: baseline; gap: 6px; }
.row-name { font-weight: 500; font-size: 15.5px; }
.leader { flex: 1; min-width: 16px; border-bottom: 1.5px dotted color-mix(in srgb, var(--muted) 55%, transparent); transform: translateY(-4px); }
.row-sub { display: block; color: var(--muted); font-size: 13.5px; margin-top: 2px; }

.badge {
  display: inline-block; margin-left: 8px; vertical-align: 2px;
  font-size: 11.5px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
  background: var(--river); color: var(--paper);
}

.foot { text-align: center; color: var(--muted); font-size: 14px; padding: 24px 16px 48px; border-top: 1px solid var(--line); max-width: 760px; margin: 0 auto; }
.foot p { margin: 0; }
.foot .insta { color: var(--ink); }
.empty { text-align: center; color: var(--muted); padding: 48px 0; }

/* detail sheet */
.sheet {
  width: min(560px, 100%); max-width: 100%; max-height: 92dvh; margin: auto auto 0; padding: 0;
  border: 0; border-radius: 22px 22px 0 0; background: var(--surface); color: var(--ink); overflow: auto;
}
@media (min-width: 640px) { .sheet { margin: auto; border-radius: 22px; } }
.sheet::backdrop { background: rgb(0 0 0 / .45); }
.sheet[open] { animation: up .28s cubic-bezier(.2,.8,.2,1); }
@keyframes up { from { transform: translateY(40px); opacity: 0; } }
.sheet-close {
  position: absolute; right: 12px; top: 12px; z-index: 1; width: 40px; height: 40px; border-radius: 50%;
  border: 0; display: grid; place-items: center; cursor: pointer;
  background: color-mix(in srgb, var(--surface) 85%, transparent); backdrop-filter: blur(6px);
}
.sheet-img { width: 100%; aspect-ratio: 1; object-fit: cover; }
.sheet-body { padding: 20px 20px calc(24px + env(safe-area-inset-bottom)); }
.sheet-name { font-size: 21px; font-weight: 600; line-height: 1.25; margin: 0 48px 8px 0; }
.sheet-img:not([hidden]) + .sheet-body .sheet-name { margin-right: 0; }
.sheet-desc { margin: 0 0 14px; color: var(--muted); }
.sheet-desc:empty { display: none; }
.sheet-foot { display: flex; justify-content: space-between; align-items: baseline; margin: 0; font-size: 18px; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .sheet[open] { animation: none; }
  .card-img img { transition: none; }
}
`;

const JS = /* js */ `
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var tabs = [].slice.call(document.querySelectorAll('[data-tab]'));
  var sections = [].slice.call(document.querySelectorAll('[data-section]'));
  var chipRows = [].slice.call(document.querySelectorAll('[data-chips]'));

  function select(sec, scroll) {
    if (!sections.some(function (s) { return s.dataset.section === sec; })) sec = sections[0] && sections[0].dataset.section;
    tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.tab === sec)); });
    sections.forEach(function (s) { s.classList.toggle('on', s.dataset.section === sec); });
    chipRows.forEach(function (c) { c.classList.toggle('on', c.dataset.chips === sec); });
    if (scroll) document.querySelector('.bar').scrollIntoView({ block: 'start' });
  }
  var fromHash = location.hash.slice(1);
  var target = fromHash && document.getElementById(fromHash);
  var startSec = target ? (target.closest('[data-section]') || target).dataset.section : null;
  select(startSec);

  tabs.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      select(t.dataset.tab, window.scrollY > document.querySelector('.bar').offsetTop);
      history.replaceState(null, '', '#' + t.dataset.tab);
    });
  });

  // highlight the category being read and keep its chip in view
  var chips = [].slice.call(document.querySelectorAll('.chip'));
  var current = null;
  function mark(id) {
    if (id === current) return;
    current = id;
    chips.forEach(function (c) {
      var on = c.getAttribute('href') === '#' + id;
      c.classList.toggle('on', on);
      if (on) {
        var row = c.parentNode;
        row.scrollTo({ left: c.offsetLeft - row.clientWidth / 2 + c.clientWidth / 2, behavior: 'smooth' });
      }
    });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
    }, { rootMargin: '-120px 0px -65% 0px' });
    document.querySelectorAll('.cat').forEach(function (c) { io.observe(c); });
  }

  // item detail sheet
  var sheet = document.getElementById('sheet');
  if (!sheet || !sheet.showModal) return;
  var img = sheet.querySelector('.sheet-img');
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-id]');
    if (!el) return;
    var it = window.MENU[el.dataset.id];
    if (!it) return;
    sheet.querySelector('.sheet-name').textContent = it.n;
    sheet.querySelector('.sheet-desc').textContent = it.d || '';
    sheet.querySelector('.sheet-foot .weight').textContent = it.w || '';
    sheet.querySelector('.sheet-foot .price').textContent = it.p;
    if (it.i) { img.src = it.i; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; }
    sheet.showModal();
  });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
})();
`;
