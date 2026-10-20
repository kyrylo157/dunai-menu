import { photoUrl, priceText, type Category, type Item, type Section, type Settings } from './db';

const h = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SECTIONS: [Section, string][] = [['kitchen', 'Кухня'], ['bar', 'Бар']];
const BADGE: Record<string, string> = { hit: 'Хіт', new: 'Новинка' };

/** Rachel Ruysch, "Summer flowers in a vase"; the page uses smoked glass over it. */
const BACKGROUND = '/bg/flowers.jpg';

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

function row(it: Item) {
  const tappable = !!(it.photo || it.description);
  const open = tappable ? 'button type="button"' : 'div';
  const close = tappable ? 'button' : 'div';
  return `<li><${open} class="row"${tapAttrs(it)}>
  <span class="row-main">
    <span class="row-line"><span class="row-name">${h(it.name)}${badge(it)}</span><span class="leader" aria-hidden="true"></span><span class="price">${priceText(it.price)}</span></span>
    ${it.weight || it.description ? `<span class="row-sub">${[it.weight, it.description].filter(Boolean).map(h).join(' · ')}</span>` : ''}
  </span>
</${close}></li>`;
}

/** "Jameson 50 мл" → { base: "Jameson", label: "50 мл" }; lets volumes of one drink share a line. */
function splitVariant(name: string) {
  const m = name.match(/^(.*?)\s+((?:скло|ж\/?б|бут\.)(?:\s+\d+(?:,\d+)?\s*(?:мл|л))?|\d+(?:,\d+)?\s*(?:мл|л))$/i);
  if (!m) return { base: name, label: '' };
  const label = m[2].replace(/^бут\.$/i, 'пляшка').replace(/^ж\/?б$/i, 'банка');
  return { base: m[1], label };
}

/** Bar: text only. One entry per drink, its volumes listed side by side. */
function drinks(list: Item[]) {
  const groups = new Map<string, { base: string; desc: string | null; badge: string; vars: { label: string; price: number }[] }>();
  for (const it of list) {
    const { base, label } = splitVariant(it.name);
    const key = base.toLowerCase();
    if (!groups.has(key)) groups.set(key, { base, desc: null, badge: '', vars: [] });
    const g = groups.get(key)!;
    g.desc ??= it.description;
    g.badge ||= badge(it);
    g.vars.push({ label, price: it.price });
  }
  return `<ul class="drinks">${[...groups.values()].map((g) => {
    const single = g.vars.length === 1;
    const head = single
      ? `<span class="row-name">${h(g.base)}${g.vars[0].label ? ` <span class="vol-inline">${h(g.vars[0].label)}</span>` : ''}${g.badge}</span><span class="leader" aria-hidden="true"></span><span class="price">${priceText(g.vars[0].price)}</span>`
      : `<span class="row-name">${h(g.base)}${g.badge}</span>`;
    const vols = single ? '' : `<span class="vols">${g.vars.map((v) =>
      `<span class="vol"><span class="vol-label">${h(v.label || 'порція')}</span><span class="price">${priceText(v.price)}</span></span>`).join('')}</span>`;
    return `<li class="drink"><span class="row-line">${head}</span>${g.desc ? `<span class="drink-desc">${h(g.desc)}</span>` : ''}${vols}</li>`;
  }).join('')}</ul>`;
}

function categoryBlock(c: Category, list: Item[]) {
  let body: string;
  if (c.section === 'bar') {
    body = drinks(list);
  } else if (c.layout === 'cards') {
    const withPhoto = list.filter((i) => i.photo);
    const without = list.filter((i) => !i.photo);
    body = (withPhoto.length ? `<ul class="cards">${withPhoto.map(card).join('')}</ul>` : '')
      + (without.length ? `<ul class="rows">${without.map(row).join('')}</ul>` : '');
  } else {
    // "list" is text only: photos stay in the database but are not shown
    body = `<ul class="rows">${list.map(row).join('')}</ul>`;
  }
  return `<section class="cat glass" id="c${c.id}" aria-labelledby="c${c.id}-t">
  <h2 class="cat-title" id="c${c.id}-t">${h(c.name)}</h2>
  ${body}
</section>`;
}

const INSTA_ICON = `<svg class="insta-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="17.2" cy="6.8" r=".95" fill="currentColor"/></svg>`;

const WIFI_ICON = `<svg class="wifi-ico" viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M2.5 9a14 14 0 0 1 19 0M5.8 12.6a9 9 0 0 1 12.4 0M9.1 16.1a4.3 4.3 0 0 1 5.8 0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="19.3" r="1.2" fill="currentColor"/></svg>`;

/** A small faceted crystal: the house ornament (between the tabs, in the footer). */
const GEM = `<svg class="gem" viewBox="0 0 20 24" width="14" height="17" aria-hidden="true">
  <path d="M10 1 19 9 10 23 1 9Z" fill="url(#gem-fill)" stroke="currentColor" stroke-width=".9" stroke-linejoin="round"/>
  <path d="M1 9h18M10 1 6.5 9 10 23 13.5 9Z" fill="none" stroke="currentColor" stroke-width=".6" stroke-linejoin="round" opacity=".75"/>
</svg>`;
const GEM_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <linearGradient id="gem-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF4DC" stop-opacity=".55"/><stop offset=".5" stop-color="#E2C27D" stop-opacity=".18"/><stop offset="1" stop-color="#E2C27D" stop-opacity=".45"/></linearGradient>
</defs></svg>`;

export function renderMenu(s: Settings, cats: Category[], all: Item[]): string {
  const textOnly = new Set(cats.filter((c) => c.section === 'bar' || c.layout !== 'cards').map((c) => c.id));
  const visible = all.filter((i) => !i.hidden).map((i) => (textOnly.has(i.category_id) ? { ...i, photo: null } : i));
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
        `<a class="tab" role="tab" href="#${sec}" data-tab="${sec}" aria-selected="${i === 0}">${label}</a>`).join(GEM)}</div>`
    : '';

  const chips = present.map(([sec]) =>
    `<div class="chips" data-chips="${sec}">${shown.filter((c) => c.section === sec)
      .map((c) => `<a class="chip" href="#c${c.id}">${h(c.name)}</a>`).join('')}</div>`).join('');

  const sections = present.map(([sec, label]) =>
    `<div class="section" id="${sec}" data-section="${sec}">
  <h2 class="visually-hidden">${label}</h2>
  ${shown.filter((c) => c.section === sec).map((c) => categoryBlock(c, byCat.get(c.id)!)).join('\n')}
</div>`).join('\n');

  const handle = s.instagram?.match(/instagram\.com\/([^/?#]+)/)?.[1];
  const instaLink = (cls: string) => s.instagram
    ? `<a class="${cls}" href="${h(s.instagram)}" target="_blank" rel="noopener">${INSTA_ICON}<span>${handle ? `@${h(handle)}` : 'Instagram'}</span></a>`
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Prata&family=Tenor+Sans&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="preload" as="image" href="${BACKGROUND}">
<style>${CSS}</style>
</head>
<body>
${GEM_DEFS}
<div class="scene" aria-hidden="true">
  <div class="art" style="--src:url('${BACKGROUND}')"></div>
  <div class="veil"></div>
</div>

<header class="hero">
  ${logo ? `<img class="logo" src="${h(logo)}" alt="${h(name)} family restaurant" width="200" height="200">` : `<span class="logo-text">${h(name)}</span>`}
  <h1 class="visually-hidden">Меню ресторану ${h(name)}</h1>
  ${s.tagline ? `<p class="tagline">${h(s.tagline)}</p>` : ''}
  ${s.hours ? `<p class="hours">${h(s.hours)}</p>` : ''}
  ${instaLink('insta')}
  ${s.wifi_name ? `<p class="wifi">${WIFI_ICON}<span>Wi-Fi ${h(s.wifi_name)}</span>${s.wifi_password
    ? `<button type="button" class="wifi-pass" data-copy="${h(s.wifi_password)}" aria-label="Скопіювати пароль Wi-Fi">${h(s.wifi_password)}</button>`
    : ''}</p>` : ''}
</header>

<nav class="bar" aria-label="Розділи меню">
  ${tabs}
  ${chips}
</nav>

<main>
${sections || '<p class="empty glass">Меню оновлюється. Загляньте трохи пізніше.</p>'}
</main>

${s.instagram ? `<footer class="foot">
  <div class="foot-rule" aria-hidden="true"><span></span>${GEM}<span></span></div>
  <p class="foot-title">Зазирніть до нас в Instagram</p>
  <p class="foot-text">Нові страви, святкові вечори та атмосфера ${h(name)}</p>
  ${instaLink('foot-link')}
</footer>` : '<footer class="foot"></footer>'}

<dialog class="sheet glass" id="sheet" aria-labelledby="sheet-name">
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
  --serif: 'Prata', Georgia, serif;
  --sans: 'Jost', system-ui, sans-serif;
  --display: 'Tenor Sans', 'Jost', sans-serif;
  /* smoked glass over the dark painting */
  --ink: #F6EFE6;
  --muted: #CABFB4;
  --line: rgba(255, 240, 225, .14);
  --glass-bg: linear-gradient(145deg, rgba(30,26,32,.62), rgba(20,18,24,.42));
  --glass-edge: rgba(255,255,255,.18);
  --glass-shine: rgba(255,255,255,.22);
  --glass-depth: 0 30px 60px -24px rgba(0,0,0,.75), 0 10px 22px -12px rgba(0,0,0,.55);
  --veil: linear-gradient(180deg, rgba(0,0,0,.1), rgba(0,0,0,.35));
  --price: #EBC88C;
  --solid-bg: #F6EFE6;
  --solid-ink: #1E1719;
  --btn-glass: rgba(255,255,255,.12);
  --gold: #E2C27D;
  --strip: rgba(18,14,16,.45);
  --lift: 0 2px 16px rgba(0,0,0,.7);
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 128px; -webkit-text-size-adjust: 100%; background: #2b2226; }
body { margin: 0; color: var(--ink); font: 400 16px/1.45 var(--sans); -webkit-font-smoothing: antialiased; }
img { display: block; max-width: 100%; }
button { font: inherit; color: inherit; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--gold); outline-offset: 3px; border-radius: 12px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---------- painting ---------- */
.scene { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
.art {
  position: absolute; inset: -4%;
  background: var(--src) 45% 40% / cover no-repeat;
  animation: breathe 40s ease-in-out infinite alternate; will-change: transform;
}
@keyframes breathe { from { transform: scale(1) translate(0, 0); } to { transform: scale(1.08) translate(-1.5%, -1%); } }
.veil { position: absolute; inset: 0; background: var(--veil); }

/* ---------- glass ---------- */
.glass {
  position: relative; isolation: isolate;
  background: var(--glass-bg);
  border: 1px solid var(--glass-edge);
  box-shadow: 0 1px 0 var(--glass-shine) inset, 0 -1px 0 rgba(0,0,0,.05) inset, var(--glass-depth);
  backdrop-filter: blur(22px) saturate(1.6); -webkit-backdrop-filter: blur(22px) saturate(1.6);
}
/* diagonal light sheen across the glass */
.glass::before {
  content: ''; position: absolute; inset: 0; z-index: -1; border-radius: inherit; pointer-events: none;
  background: linear-gradient(125deg, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 70%, rgba(255,255,255,.12) 100%);
}
.glass::before { opacity: .45; }

/* buttons: clear glass by default, a solid ink pill for the selected/primary one */
.btn-glass {
  color: var(--ink); background: var(--btn-glass); border: 1px solid var(--glass-edge);
  box-shadow: 0 1px 0 var(--glass-shine) inset, 0 8px 20px -12px rgba(0,0,0,.5);
  backdrop-filter: blur(16px) saturate(1.8); -webkit-backdrop-filter: blur(16px) saturate(1.8);
}
/* ---------- hero: the logo straight on the painting, no boxes ---------- */
.hero {
  min-height: min(60svh, 560px); display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 48px 20px 40px; text-align: center; text-shadow: var(--lift);
}
.logo {
  width: 172px; height: 172px; border-radius: 50%; margin-bottom: 24px; animation: appear 1.2s ease both;
  filter: invert(1) drop-shadow(0 8px 30px rgba(0,0,0,.5)); mix-blend-mode: screen;
}
@keyframes appear { from { opacity: 0; transform: scale(.96); } }
.logo-text { font: 56px/1 var(--display); margin-bottom: 20px; }
.tagline { margin: 0; font: 19px/1.35 var(--display); letter-spacing: .06em; }
.hours { margin: 6px 0 0; font-size: 14.5px; font-weight: 400; letter-spacing: .08em; opacity: .85; }
/* instagram: a plain line glyph and the handle on a gold hairline, no button */
.insta, .foot-link {
  display: inline-flex; align-items: center; gap: 9px; text-decoration: none;
  font: 15px/1 var(--display); letter-spacing: .06em;
}
.insta { margin-top: 24px; color: var(--ink); text-shadow: 0 1px 3px rgba(0,0,0,.9), 0 0 14px rgba(0,0,0,.8); }
.insta-ico { flex: none; color: var(--gold); filter: drop-shadow(0 1px 6px rgba(0,0,0,.6)); }
.insta span, .foot-link span { padding-bottom: 5px; border-bottom: 1px solid color-mix(in srgb, var(--gold) 55%, transparent); transition: border-color .2s ease; }
.insta:active span, .foot-link:active span { border-color: var(--gold); }
@media (hover: hover) { .insta:hover span, .foot-link:hover span { border-color: var(--gold); } }
.wifi {
  display: inline-flex; align-items: center; flex-wrap: wrap; justify-content: center; gap: 4px 9px; margin: 16px 0 0;
  font: 16px/1 var(--serif); letter-spacing: .04em; color: var(--ink);
  text-shadow: 0 1px 3px rgba(0,0,0,.9), 0 0 14px rgba(0,0,0,.8);
}
.wifi-ico { flex: none; color: var(--gold); filter: drop-shadow(0 1px 6px rgba(0,0,0,.6)); }
/* the password copies on tap; the label flips to "Скопійовано" for a moment */
.wifi-pass {
  all: unset; cursor: pointer; position: relative; padding: 6px 10px; margin: -6px 0; border-radius: 8px;
  font: 16px/1 var(--serif); letter-spacing: .06em; color: var(--price); font-variant-numeric: lining-nums;
  -webkit-tap-highlight-color: transparent;
}
.wifi-pass::after {
  content: ''; position: absolute; left: 10px; right: 10px; bottom: 1px; height: 1px;
  background: repeating-linear-gradient(90deg, color-mix(in srgb, var(--gold) 70%, transparent) 0 3px, transparent 3px 6px);
}
.wifi-pass.copied { color: var(--gold); }

/* ---------- sticky nav: a frosted strip with text links ---------- */
.bar {
  position: sticky; top: 0; z-index: 5;
  background: var(--strip); border-block: 1px solid var(--glass-edge);
  backdrop-filter: blur(22px) saturate(1.6); -webkit-backdrop-filter: blur(22px) saturate(1.6);
  box-shadow: 0 12px 30px -20px rgba(0,0,0,.6);
}
.tabs { display: flex; justify-content: center; align-items: center; gap: 30px; padding: 14px 16px 0; }
.gem { flex: none; color: var(--gold); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--gold) 45%, transparent)); }
.tabs .gem { margin-bottom: 9px; }
.tab {
  position: relative; text-decoration: none; padding: 2px 2px 10px;
  font: 18px/1.2 var(--display); letter-spacing: .08em; color: var(--muted); transition: color .25s ease;
}
.tab::after {
  content: ''; position: absolute; left: 50%; bottom: 0; width: 0; height: 1px; background: var(--gold);
  transition: width .35s ease, left .35s ease;
}
.tab[aria-selected="true"] { color: var(--ink); }
.tab[aria-selected="true"]::after { left: 0; width: 100%; }
.chips { display: flex; gap: 24px; overflow-x: auto; padding: 10px 20px 13px; scrollbar-width: none; scroll-padding-inline: 20px; }
.chips::-webkit-scrollbar { display: none; }
.chip {
  flex: none; position: relative; text-decoration: none; white-space: nowrap; padding: 4px 0 7px;
  font-size: 14.5px; font-weight: 400; letter-spacing: .04em; color: var(--muted); transition: color .2s ease;
}
.chip::after {
  content: ''; position: absolute; left: 50%; bottom: 0; width: 4px; height: 4px; translate: -50% 0; rotate: 45deg;
  background: var(--gold); opacity: 0; transition: opacity .2s ease;
}
.chip.on { color: var(--ink); }
.chip.on::after { opacity: 1; }
.js [data-chips]:not(.on), .js .section:not(.on) { display: none; }

/* ---------- content ---------- */
main { max-width: 780px; margin: 0 auto; padding: 4px 12px 24px; }
.cat { margin-top: 18px; padding: 24px 16px 14px; border-radius: 30px; }
.cat-title { margin: 0 4px 20px; font: 32px/1.1 var(--serif); letter-spacing: .01em; }

.cards { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 12px; }
@media (min-width: 640px) { .cards { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.card {
  all: unset; box-sizing: border-box; display: flex; flex-direction: column; gap: 3px; width: 100%; height: 100%;
  cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.card:not([data-id]) { cursor: default; }
.card-img {
  position: relative; aspect-ratio: 1; border-radius: 20px; overflow: hidden; margin-bottom: 8px;
  box-shadow: 0 22px 30px -18px rgba(0,0,0,.65), 0 4px 8px -3px rgba(0,0,0,.3);
  transition: transform .2s ease;
}
.card-img::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  box-shadow: 0 0 0 1px rgba(255,255,255,.4) inset;
  background: linear-gradient(155deg, rgba(255,255,255,.28), transparent 35%);
}
.card-img img { width: 100%; height: 100%; object-fit: cover; }
.card[data-id]:active .card-img { transform: scale(.97); }
.card-img .badge { position: absolute; left: 8px; top: 8px; margin: 0; z-index: 1; }
.card-name { font-weight: 500; font-size: 16px; line-height: 1.3; padding: 0 2px; }
.card-desc { color: var(--muted); font-size: 13px; line-height: 1.35; padding: 0 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-foot { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-top: auto; padding: 2px 2px 0; }
.weight { color: var(--muted); font-size: 13px; }
.price { font: 17px/1.2 var(--serif); white-space: nowrap; font-variant-numeric: lining-nums tabular-nums; color: var(--price); }

.rows { list-style: none; margin: 0; padding: 0; }
.cards + .rows { margin-top: 18px; }
.row { all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 12px; width: 100%; padding: 11px 4px; border-bottom: 1px solid var(--line); -webkit-tap-highlight-color: transparent; }
button.row { cursor: pointer; }
li:last-child > .row { border-bottom: 0; }
.row-main { flex: 1; min-width: 0; }
.row-line { display: flex; align-items: baseline; gap: 6px; }
.row-name { font-weight: 500; font-size: 16px; }

/* bar: text only */
.drinks { list-style: none; margin: 0; padding: 0; }
.drink { display: flex; flex-direction: column; gap: 3px; padding: 14px 4px; border-bottom: 1px solid var(--line); }
.drink:last-child { border-bottom: 0; }
.vol-inline { font-weight: 400; color: var(--muted); font-size: 14px; }
.drink-desc { color: var(--muted); font-size: 14px; line-height: 1.4; }
.vols { display: flex; flex-wrap: wrap; gap: 6px 18px; margin-top: 4px; }
.vol { display: inline-flex; align-items: baseline; gap: 8px; }
.vol-label { color: var(--muted); font-size: 13.5px; }
.vol .price { font-size: 16px; }
.leader { flex: 1; min-width: 16px; border-bottom: 1.5px dotted color-mix(in srgb, var(--muted) 55%, transparent); transform: translateY(-4px); }
.row-sub { display: block; color: var(--muted); font-size: 13px; margin-top: 2px; }

.badge {
  display: inline-block; margin-left: 8px; vertical-align: 2px; font-size: 11px; font-weight: 500; letter-spacing: .06em;
  padding: 3px 10px; border-radius: 999px; color: var(--solid-ink); background: var(--solid-bg);
}

/* footer: an invitation to Instagram set straight on the painting */
.foot {
  display: flex; flex-direction: column; align-items: center; text-align: center; text-shadow: var(--lift);
  padding: 44px 24px calc(56px + env(safe-area-inset-bottom));
  background: radial-gradient(60% 55% at 50% 52%, rgba(12,9,11,.62), rgba(12,9,11,0));
}
.foot-rule { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; }
.foot-rule span { width: 64px; height: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--gold) 70%, transparent)); }
.foot-rule span:last-child { transform: scaleX(-1); }
.foot-title { margin: 0; max-width: 18ch; font: 27px/1.2 var(--serif); text-wrap: balance; }
.foot-text { margin: 10px 0 22px; max-width: 30ch; color: var(--muted); font-size: 15px; line-height: 1.5; }
.foot-link { color: var(--ink); font-size: 16px; }
.empty { text-align: center; padding: 40px 16px; border-radius: 30px; }

/* ---------- detail sheet ---------- */
.sheet {
  position: fixed; width: min(560px, 100%); max-width: 100%; max-height: 92dvh; margin: auto auto 0; padding: 0; color: var(--ink);
  border-bottom: 0; border-radius: 30px 30px 0 0; overflow: auto;
  /* solid enough on its own: Safari may skip the blur behind a dialog */
  background: linear-gradient(160deg, rgba(38,32,36,.96), rgba(22,18,22,.97));
}
@media (min-width: 640px) { .sheet { margin: auto; border-radius: 30px; border-bottom: 1px solid var(--glass-edge); } }
.sheet::backdrop { background: rgba(14, 8, 11, .6); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
.sheet[open] { animation: up .35s cubic-bezier(.2,.9,.25,1); }
@keyframes up { from { transform: translateY(60px); opacity: 0; } }
.sheet-close { position: absolute; right: 14px; top: 14px; z-index: 2; width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; }
.sheet-img { width: calc(100% - 20px); margin: 10px 10px 0; aspect-ratio: 1; object-fit: cover; border-radius: 22px; box-shadow: 0 22px 34px -18px rgba(0,0,0,.7); }
.sheet-body { padding: 18px 22px calc(26px + env(safe-area-inset-bottom)); }
.sheet-name { margin: 0 52px 8px 0; font: 26px/1.2 var(--serif); }
.sheet-img:not([hidden]) + .sheet-body .sheet-name { margin-right: 0; }
.sheet-desc { margin: 0 0 14px; color: var(--muted); }
.sheet-desc:empty { display: none; }
.sheet-foot { display: flex; justify-content: space-between; align-items: baseline; margin: 0; font-size: 19px; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .art, .logo, .sheet[open] { animation: none; }
  .tab::after { transition: none; }
}
`;

const JS = /* js */ `
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var tabsEl = document.querySelector('.tabs');
  var tabs = [].slice.call(document.querySelectorAll('[data-tab]'));
  var sections = [].slice.call(document.querySelectorAll('[data-section]'));
  var chipRows = [].slice.call(document.querySelectorAll('[data-chips]'));
  var bar = document.querySelector('.bar');
  var hero = document.querySelector('.hero');

  function select(sec, scroll) {
    if (!sections.some(function (s) { return s.dataset.section === sec; })) sec = sections[0] && sections[0].dataset.section;
    tabs.forEach(function (t, i) {
      var on = t.dataset.tab === sec;
      t.setAttribute('aria-selected', String(on));
      if (on && tabsEl) tabsEl.dataset.active = String(i);
    });
    sections.forEach(function (s) { s.classList.toggle('on', s.dataset.section === sec); });
    chipRows.forEach(function (c) { c.classList.toggle('on', c.dataset.chips === sec); });
    if (scroll) window.scrollTo({ top: hero.offsetHeight, behavior: 'smooth' });
  }
  var fromHash = location.hash.slice(1);
  var target = fromHash && document.getElementById(fromHash);
  select(target ? (target.closest('[data-section]') || target).dataset.section : null);

  tabs.forEach(function (t) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      select(t.dataset.tab, window.scrollY > hero.offsetHeight);
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
  var ticking = false;
  function onScroll() {
    ticking = false;
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

  // wifi password: tap to copy
  var pass = document.querySelector('.wifi-pass');
  if (pass) pass.addEventListener('click', function () {
    var value = pass.dataset.copy;
    function done() {
      pass.textContent = 'Скопійовано';
      pass.classList.add('copied');
      setTimeout(function () { pass.textContent = value; pass.classList.remove('copied'); }, 1600);
    }
    if (navigator.clipboard) navigator.clipboard.writeText(value).then(done, function () {});
  });

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
