import { branchSvg } from './botanic';
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
  const tappable = !!(it.photo || it.description);
  const open = tappable ? 'button type="button"' : 'div';
  const close = tappable ? 'button' : 'div';
  const thumb = withThumb
    ? `<span class="thumb">${src ? `<img src="${h(src)}" alt="" loading="lazy" decoding="async" width="56" height="56">` : ''}</span>`
    : '';
  return `<li><${open} class="row"${tapAttrs(it)}>${thumb}
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
    body = `<ul class="rows">${list.map((i) => row(i, thumbs)).join('')}</ul>`;
  }
  return `<section class="cat panel" id="c${c.id}" aria-labelledby="c${c.id}-t">
  <h2 class="cat-title" id="c${c.id}-t">${h(c.name)}</h2>
  ${body}
</section>`;
}

const INSTA_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>`;

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
    ? `<div class="tabs glass" role="tablist"><span class="tab-thumb" aria-hidden="true"></span>${present.map(([sec, label], i) =>
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
    ? `<a class="btn-gloss" href="${h(s.instagram)}" target="_blank" rel="noopener">${INSTA_ICON}<span>Ми в Instagram</span></a>`
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
<meta name="theme-color" content="#E9EDE4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121813" media="(prefers-color-scheme: dark)">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Commissioner:wght@400;500;600;700&family=Marck+Script&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="scene" aria-hidden="true">
  <div class="sun"></div>
  <div class="shade">${branchSvg({ id: 'sh', seed: 7, leaves: 15, flat: true })}</div>
  <div class="branch branch-top">${branchSvg({ id: 'bt', seed: 3, leaves: 13 })}</div>
  <div class="branch branch-bottom">${branchSvg({ id: 'bb', seed: 11, leaves: 9 })}</div>
</div>

<header class="hero">
  <div class="medallion">
    ${logo ? `<img class="logo" src="${h(logo)}" alt="${h(name)} family restaurant" width="200" height="200">` : `<span class="logo-text">${h(name)}</span>`}
  </div>
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
${sections || '<p class="empty panel">Меню оновлюється. Загляньте трохи пізніше.</p>'}
</main>

<footer class="foot">
  <p>Ціни вказані в гривнях</p>
  ${insta}
</footer>

<dialog class="sheet" id="sheet" aria-labelledby="sheet-name">
  <form method="dialog"><button class="sheet-close btn-glass" aria-label="Закрити">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
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
  --bg-top: #F1F3EC;
  --bg-bottom: #DFE6DA;
  --sun: rgba(255, 249, 228, .95);
  --ink: #1F2A21;
  --muted: #677362;
  --line: rgba(47, 66, 46, .14);
  --olive: #4E6542;
  --olive-hi: #7C9468;
  --olive-lo: #2F4128;

  --leaf-hi: #A9BC93;
  --leaf-mid: #6F8A5D;
  --leaf-lo: #3C5232;
  --stem: #5E5A3E;
  --shade: #2C3B27;

  --glass: linear-gradient(150deg, rgba(255,255,255,.72), rgba(255,255,255,.38));
  --glass-edge: rgba(255,255,255,.85);
  --glass-shadow: 0 1px 0 rgba(255,255,255,.9) inset, 0 -1px 0 rgba(47,66,46,.06) inset, 0 24px 48px -28px rgba(37,56,34,.45), 0 4px 12px -6px rgba(37,56,34,.18);
  --panel: linear-gradient(160deg, rgba(255,255,255,.78), rgba(255,255,255,.55));

  --script: 'Marck Script', cursive;
  --sans: 'Commissioner', system-ui, sans-serif;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg-top: #18211A;
    --bg-bottom: #0E140F;
    --sun: rgba(190, 214, 160, .16);
    --ink: #E7EDE2;
    --muted: #9CA894;
    --line: rgba(231, 237, 226, .1);
    --olive: #8EA87A;
    --olive-hi: #A9C293;
    --olive-lo: #4A6340;
    --leaf-hi: #5E7A4E;
    --leaf-mid: #3B5232;
    --leaf-lo: #1E2D1B;
    --stem: #3F3D2A;
    --shade: #000;
    --glass: linear-gradient(150deg, rgba(255,255,255,.14), rgba(255,255,255,.05));
    --glass-edge: rgba(255,255,255,.16);
    --glass-shadow: 0 1px 0 rgba(255,255,255,.12) inset, 0 24px 48px -24px rgba(0,0,0,.7), 0 4px 12px -6px rgba(0,0,0,.5);
    --panel: linear-gradient(160deg, rgba(34,46,35,.78), rgba(22,31,23,.66));
    color-scheme: dark;
  }
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 128px; -webkit-text-size-adjust: 100%; }
body {
  margin: 0; min-height: 100dvh; color: var(--ink);
  background: linear-gradient(180deg, var(--bg-top), var(--bg-bottom)) fixed;
  background-color: var(--bg-bottom);
  font: 400 16px/1.45 var(--sans);
  -webkit-font-smoothing: antialiased;
}
img { display: block; max-width: 100%; }
button { font: inherit; color: inherit; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--olive); outline-offset: 3px; border-radius: 10px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---------- living background ---------- */
.scene { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.sun {
  position: absolute; inset: -20% -30% auto auto; width: 120vmax; height: 90vmax;
  background: radial-gradient(closest-side, var(--sun), transparent 70%);
}
/* soft shadow of foliage falling across the page, swaying as a whole */
.shade {
  position: absolute; top: -8vh; left: -25vw; width: 150vw; max-width: 1100px; color: var(--shade);
  opacity: .11; filter: blur(14px); transform-origin: 0 0;
  animation: drift 14s ease-in-out infinite alternate; will-change: transform;
}
@media (prefers-color-scheme: dark) { .shade { opacity: .35; } }
.branch { position: absolute; filter: drop-shadow(0 18px 14px rgba(30,45,28,.28)) drop-shadow(0 2px 2px rgba(30,45,28,.2)); }
.branch svg, .shade svg { display: block; width: 100%; height: auto; overflow: visible; }
.branch-top { width: min(400px, 82vw); top: -40px; right: -70px; transform: scaleX(-1) rotate(8deg); }
.branch-bottom { width: min(300px, 62vw); bottom: -50px; left: -60px; transform: rotate(-4deg) scaleY(-1) rotate(180deg); opacity: .9; }
.lf { transform-box: fill-box; transform-origin: 0% 50%; animation: sway var(--s, 6s) ease-in-out var(--d, 0s) infinite alternate; }
@keyframes sway { from { transform: rotate(-5deg); } to { transform: rotate(6deg); } }
@keyframes drift { from { transform: rotate(-1.5deg) translate(0, 0); } to { transform: rotate(2deg) translate(2vw, 1vh); } }

/* ---------- glass + gloss primitives ---------- */
.glass, .panel, .btn-glass {
  background: var(--glass); border: 1px solid var(--glass-edge); box-shadow: var(--glass-shadow);
}
.panel { background: var(--panel); }
/* mirror buttons: deep olive with a reflective top half */
.btn-gloss, .chip.on, .tab-thumb {
  position: relative; isolation: isolate; color: #fff;
  background: linear-gradient(180deg, var(--olive-hi) 0%, var(--olive) 48%, var(--olive-lo) 100%);
  border: 1px solid rgba(255,255,255,.35);
  box-shadow: 0 1px 0 rgba(255,255,255,.55) inset, 0 -2px 6px rgba(0,0,0,.18) inset, 0 10px 20px -8px rgba(37,56,34,.6), 0 2px 4px rgba(37,56,34,.25);
  text-shadow: 0 1px 1px rgba(0,0,0,.25);
}
.btn-gloss::before, .chip.on::before, .tab-thumb::before {
  content: ''; position: absolute; z-index: -1; left: 6%; right: 6%; top: 2px; height: 48%;
  border-radius: 999px 999px 40% 40% / 999px 999px 18px 18px;
  background: linear-gradient(180deg, rgba(255,255,255,.62), rgba(255,255,255,.08));
}
.btn-gloss {
  display: inline-flex; align-items: center; gap: 9px; padding: 12px 22px; border-radius: 999px;
  text-decoration: none; font-weight: 600; font-size: 15px; letter-spacing: .01em;
  transition: transform .15s ease, box-shadow .15s ease;
}
.btn-gloss:active { transform: translateY(1px) scale(.98); }

/* ---------- hero ---------- */
.hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 44px 16px 26px; gap: 6px; }
.medallion {
  width: 184px; height: 184px; border-radius: 50%; padding: 10px; margin-bottom: 18px;
  background: radial-gradient(circle at 35% 25%, #fff, #F2F2EC 60%, #E2E5DC);
  border: 1px solid rgba(255,255,255,.9);
  box-shadow: 0 2px 0 rgba(255,255,255,.9) inset, 0 -8px 18px rgba(60,82,50,.12) inset, 0 34px 50px -24px rgba(37,56,34,.55), 0 10px 18px -10px rgba(37,56,34,.35);
}
.logo { width: 100%; height: 100%; border-radius: 50%; mix-blend-mode: multiply; }
.logo-text { display: grid; place-items: center; height: 100%; font: 56px/1 var(--script); color: #1F2A21; }
@media (prefers-color-scheme: dark) {
  .medallion { background: radial-gradient(circle at 35% 25%, #2E3B2F, #1A231B 70%); border-color: rgba(255,255,255,.12); }
  .logo { filter: invert(1); mix-blend-mode: screen; }
  .logo-text { color: #E7EDE2; }
}
.tagline { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: .005em; }
.hours { margin: 0 0 14px; color: var(--muted); font-size: 15px; }

/* ---------- sticky nav ---------- */
.bar { position: sticky; top: 0; z-index: 5; padding: 10px 0 2px; }
/* frosted backdrop appears only once the bar sticks to the top */
.bar::before {
  content: ''; position: absolute; inset: 0 0 -10px; z-index: -1; opacity: 0; transition: opacity .25s ease;
  background: color-mix(in srgb, var(--bg-top) 82%, transparent);
  backdrop-filter: blur(20px) saturate(1.5); -webkit-backdrop-filter: blur(20px) saturate(1.5);
  mask-image: linear-gradient(180deg, #000 88%, transparent); -webkit-mask-image: linear-gradient(180deg, #000 88%, transparent);
}
.bar.stuck::before { opacity: 1; }
.tabs {
  position: relative; display: grid; grid-template-columns: 1fr 1fr; width: min(300px, calc(100% - 32px));
  margin: 0 auto; padding: 4px; border-radius: 999px;
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.tab {
  position: relative; z-index: 1; text-align: center; text-decoration: none; padding: 9px 0;
  font-weight: 600; font-size: 15.5px; color: var(--muted); transition: color .25s ease;
}
.tab[aria-selected="true"] { color: #fff; text-shadow: 0 1px 1px rgba(0,0,0,.25); }
.tab-thumb {
  position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 999px;
  transition: transform .35s cubic-bezier(.3,1.3,.5,1);
}
.tabs[data-active="1"] .tab-thumb { transform: translateX(100%); }
.chips {
  display: flex; gap: 8px; overflow-x: auto; padding: 12px 16px 14px;
  scrollbar-width: none; scroll-snap-type: x proximity; scroll-padding-inline: 16px;
}
.chips::-webkit-scrollbar { display: none; }
.chip {
  flex: none; scroll-snap-align: start; text-decoration: none; white-space: nowrap;
  font-size: 14px; font-weight: 500; padding: 8px 15px; border-radius: 999px; color: var(--ink);
  background: var(--glass); border: 1px solid var(--glass-edge);
  box-shadow: 0 1px 0 rgba(255,255,255,.8) inset, 0 6px 14px -8px rgba(37,56,34,.4);
  transition: transform .15s ease;
}
.chip:active { transform: scale(.96); }
.js [data-chips]:not(.on), .js .section:not(.on) { display: none; }

/* ---------- content ---------- */
main { max-width: 780px; margin: 0 auto; padding: 4px 12px 28px; }
.cat { margin-top: 16px; padding: 22px 16px 14px; border-radius: 30px; }
.cat-title {
  font: 44px/1.05 var(--script); font-weight: 400; margin: 0 4px 18px; color: var(--ink);
  text-shadow: 0 1px 0 rgba(255,255,255,.7);
}
@media (prefers-color-scheme: dark) { .cat-title { text-shadow: 0 2px 10px rgba(0,0,0,.4); } }

.cards { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 12px; }
@media (min-width: 640px) { .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.card {
  all: unset; box-sizing: border-box; display: flex; flex-direction: column; gap: 3px; width: 100%; height: 100%;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.card:not([data-id]) { cursor: default; }
.card-img {
  position: relative; aspect-ratio: 1; border-radius: 20px; overflow: hidden; margin-bottom: 8px;
  background: var(--line);
  box-shadow: 0 18px 26px -16px rgba(37,56,34,.55), 0 3px 6px -2px rgba(37,56,34,.2);
  transition: transform .2s ease;
}
/* glossy rim on photos */
.card-img::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: 0 0 0 1px rgba(255,255,255,.45) inset;
  background: linear-gradient(160deg, rgba(255,255,255,.22), transparent 38%);
}
.card-img img { width: 100%; height: 100%; object-fit: cover; }
.card[data-id]:active .card-img { transform: scale(.97); }
.card-img .badge { position: absolute; left: 8px; top: 8px; margin: 0; z-index: 1; }
.card-name { font-weight: 600; font-size: 15px; line-height: 1.3; padding: 0 2px; }
.card-desc {
  color: var(--muted); font-size: 13px; line-height: 1.35; padding: 0 2px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-foot { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-top: auto; padding: 2px 2px 0; }
.weight { color: var(--muted); font-size: 13px; }
.price { font-weight: 700; white-space: nowrap; font-variant-numeric: tabular-nums; color: var(--olive-lo); }
@media (prefers-color-scheme: dark) { .price { color: var(--olive-hi); } }

.rows { list-style: none; margin: 0; padding: 0; }
.cards + .rows { margin-top: 18px; }
.row {
  all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 11px 4px; border-bottom: 1px solid var(--line); -webkit-tap-highlight-color: transparent;
}
button.row { cursor: pointer; }
li:last-child > .row { border-bottom: 0; }
.thumb {
  flex: none; width: 52px; height: 52px; border-radius: 14px; overflow: hidden; background: rgba(255,255,255,.6);
  box-shadow: 0 8px 14px -8px rgba(37,56,34,.5), 0 0 0 1px rgba(255,255,255,.7) inset;
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb:empty { background: transparent; box-shadow: none; }
.row-main { flex: 1; min-width: 0; }
.row-line { display: flex; align-items: baseline; gap: 6px; }
.row-name { font-weight: 500; font-size: 15.5px; }
.leader { flex: 1; min-width: 16px; border-bottom: 1.5px dotted color-mix(in srgb, var(--muted) 60%, transparent); transform: translateY(-4px); }
.row-sub { display: block; color: var(--muted); font-size: 13px; margin-top: 2px; }

.badge {
  display: inline-block; margin-left: 8px; vertical-align: 2px; position: relative; isolation: isolate; overflow: hidden;
  font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: #fff;
  background: linear-gradient(180deg, #D9A441, #B07A1E); border: 1px solid rgba(255,255,255,.4);
  box-shadow: 0 1px 0 rgba(255,255,255,.5) inset, 0 4px 8px -3px rgba(120,80,10,.5);
}

.foot { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; color: var(--muted); font-size: 14px; padding: 18px 16px calc(48px + env(safe-area-inset-bottom)); }
.foot p { margin: 0; }
.empty { text-align: center; color: var(--muted); padding: 40px 16px; border-radius: 30px; }

/* ---------- detail sheet ---------- */
.sheet {
  width: min(560px, 100%); max-width: 100%; max-height: 92dvh; margin: auto auto 0; padding: 0;
  border: 1px solid var(--glass-edge); border-bottom: 0; border-radius: 30px 30px 0 0;
  background: var(--panel); color: var(--ink); overflow: auto;
  backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4);
  box-shadow: 0 -20px 60px -20px rgba(20,30,18,.5);
}
@media (min-width: 640px) { .sheet { margin: auto; border-radius: 30px; border-bottom: 1px solid var(--glass-edge); } }
.sheet::backdrop { background: rgba(20, 30, 18, .4); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
.sheet[open] { animation: up .35s cubic-bezier(.2,.9,.25,1); }
@keyframes up { from { transform: translateY(60px); opacity: 0; } }
.sheet-close {
  position: absolute; right: 14px; top: 14px; z-index: 2; width: 42px; height: 42px; border-radius: 50%;
  display: grid; place-items: center; cursor: pointer; color: var(--ink);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
}
.sheet-img { width: calc(100% - 20px); margin: 10px 10px 0; aspect-ratio: 1; object-fit: cover; border-radius: 22px; box-shadow: 0 20px 30px -18px rgba(37,56,34,.6); }
.sheet-body { padding: 18px 22px calc(26px + env(safe-area-inset-bottom)); }
.sheet-name { font-size: 22px; font-weight: 700; line-height: 1.25; margin: 0 52px 8px 0; }
.sheet-img:not([hidden]) + .sheet-body .sheet-name { margin-right: 0; }
.sheet-desc { margin: 0 0 14px; color: var(--muted); }
.sheet-desc:empty { display: none; }
.sheet-foot { display: flex; justify-content: space-between; align-items: baseline; margin: 0; font-size: 19px; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .lf, .shade, .sheet[open] { animation: none; }
  .tab-thumb { transition: none; }
}
`;

const JS = /* js */ `
(function () {
  document.documentElement.classList.add('js');
  var tabsEl = document.querySelector('.tabs');
  var tabs = [].slice.call(document.querySelectorAll('[data-tab]'));
  var sections = [].slice.call(document.querySelectorAll('[data-section]'));
  var chipRows = [].slice.call(document.querySelectorAll('[data-chips]'));
  var bar = document.querySelector('.bar');

  function select(sec, scroll) {
    if (!sections.some(function (s) { return s.dataset.section === sec; })) sec = sections[0] && sections[0].dataset.section;
    tabs.forEach(function (t, i) {
      var on = t.dataset.tab === sec;
      t.setAttribute('aria-selected', String(on));
      if (on && tabsEl) tabsEl.dataset.active = String(i);
    });
    sections.forEach(function (s) { s.classList.toggle('on', s.dataset.section === sec); });
    chipRows.forEach(function (c) { c.classList.toggle('on', c.dataset.chips === sec); });
    if (scroll) window.scrollTo({ top: document.querySelector('.hero').offsetHeight, behavior: 'smooth' });
  }
  var fromHash = location.hash.slice(1);
  var target = fromHash && document.getElementById(fromHash);
  select(target ? (target.closest('[data-section]') || target).dataset.section : null);

  tabs.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      select(t.dataset.tab, window.scrollY > document.querySelector('.hero').offsetHeight);
      history.replaceState(null, '', '#' + t.dataset.tab);
      current = null;
      requestAnimationFrame(onScroll);
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
  var hero = document.querySelector('.hero');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var y = window.scrollY;
    bar.classList.toggle('stuck', y >= hero.offsetHeight - 1);
    // the active category is the last visible one whose top has passed under the bar
    var line = bar.offsetHeight + 24;
    var active = null;
    document.querySelectorAll('.section.on .cat').forEach(function (c) {
      if (c.getBoundingClientRect().top <= line) active = c.id;
    });
    if (!active) {
      var first = document.querySelector('.section.on .cat');
      active = first && first.id;
    }
    if (active) mark(active);
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

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
