import { photoUrl, priceText, type Category, type Item, type Section, type Settings } from './db';

const h = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SECTIONS: [Section, string][] = [['kitchen', 'Кухня'], ['bar', 'Бар']];
const BADGE: Record<string, string> = { hit: 'Хіт', new: 'Новинка' };

/** Background choices; `tone` picks frosted (light) or smoked (dark) glass to keep text readable. */
export const BACKGROUNDS = [
  { id: 'lilies', name: 'Моне. Лілії', tone: 'light', src: '/bg/lilies.jpg' },
  { id: 'rhone', name: 'Ван Гог. Зоряна ніч', tone: 'dark', src: '/bg/rhone.jpg' },
  { id: 'flowers', name: 'Рюйш. Квіти', tone: 'dark', src: '/bg/flowers.jpg' },
  { id: 'poppies', name: 'Моне. Маки', tone: 'light', src: '/bg/poppies.jpg' },
  { id: 'lace', name: 'Мереживо', tone: 'light', src: '/bg/lace.svg' },
] as const;

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
      + (without.length ? `<ul class="rows">${without.map((i) => row(i, false)).join('')}</ul>` : '');
  } else {
    const thumbs = list.some((i) => i.photo);
    body = `<ul class="rows">${list.map((i) => row(i, thumbs)).join('')}</ul>`;
  }
  return `<section class="cat glass" id="c${c.id}" aria-labelledby="c${c.id}-t">
  <h2 class="cat-title" id="c${c.id}-t">${h(c.name)}</h2>
  ${body}
</section>`;
}

const INSTA_ICON = `<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor"/></svg>`;

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
  const bg = BACKGROUNDS.find((b) => b.id === s.background) ?? BACKGROUNDS[0];

  const tabs = present.length > 1
    ? `<div class="tabs glass" role="tablist"><span class="tab-thumb solid" aria-hidden="true"></span>${present.map(([sec, label], i) =>
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
    ? `<a class="btn solid" href="${h(s.instagram)}" target="_blank" rel="noopener">${INSTA_ICON}<span>Ми в Instagram</span></a>`
    : '';

  const picker = BACKGROUNDS.map((b) =>
    `<button type="button" class="bg-opt" data-bg="${b.id}" data-tone-of="${b.tone}" aria-pressed="${b.id === bg.id}">
  <span class="bg-swatch" style="background-image:url('${b.src}')${b.id === 'lace' ? ';background-color:#B98C93;background-size:60px' : ''}"></span>
  <span class="bg-name">${b.name}</span>
</button>`).join('');

  return `<!doctype html>
<html lang="uk" data-bg="${bg.id}" data-tone="${bg.tone}">
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
<link href="https://fonts.googleapis.com/css2?family=Prata&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<script>try{var b=localStorage.getItem('dunai-bg');var o=${JSON.stringify(Object.fromEntries(BACKGROUNDS.map((x) => [x.id, x.tone])))};if(b&&o[b]){document.documentElement.dataset.bg=b;document.documentElement.dataset.tone=o[b];}}catch(e){}</script>
<style>${CSS}</style>
</head>
<body>
<div class="scene" aria-hidden="true">
  ${BACKGROUNDS.map((b) => `<div class="art" data-art="${b.id}" style="--src:url('${b.src}')"></div>`).join('')}
  <div class="veil"></div>
</div>

<header class="hero">
  <div class="medallion glass">
    ${logo ? `<img class="logo" src="${h(logo)}" alt="${h(name)} family restaurant" width="200" height="200">` : `<span class="logo-text">${h(name)}</span>`}
  </div>
  <div class="hero-card glass">
    <h1 class="visually-hidden">Меню ресторану ${h(name)}</h1>
    ${s.tagline ? `<p class="tagline">${h(s.tagline)}</p>` : ''}
    ${s.hours ? `<p class="hours">${h(s.hours)}</p>` : ''}
    ${insta}
  </div>
</header>

<nav class="bar" aria-label="Розділи меню">
  ${tabs}
  ${chips}
</nav>

<main>
${sections || '<p class="empty glass">Меню оновлюється. Загляньте трохи пізніше.</p>'}
</main>

<footer class="foot">
  <p class="foot-note glass">Ціни вказані в гривнях</p>
</footer>

<div class="bg-picker">
  <div class="bg-panel glass" id="bg-panel" hidden>
    <p class="bg-title">Оберіть фон</p>
    <div class="bg-list">${picker}</div>
  </div>
  <button type="button" class="bg-toggle btn-glass" aria-controls="bg-panel" aria-expanded="false">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6h1.9A4.9 4.9 0 0 0 21 10.7C21 6.4 17 3 12 3Z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="7.5" cy="11" r="1.3" fill="currentColor"/><circle cx="10" cy="7.3" r="1.3" fill="currentColor"/><circle cx="14.5" cy="7.3" r="1.3" fill="currentColor"/><circle cx="17" cy="11" r="1.3" fill="currentColor"/></svg>
    <span>Фон</span>
  </button>
</div>

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
  --accent-hi: #B38B4D;
}
/* frosted glass over bright paintings */
[data-tone="light"] {
  --ink: #23191B;
  --muted: #5F5153;
  --line: rgba(60, 30, 36, .14);
  --glass-bg: linear-gradient(145deg, rgba(255,255,255,.66), rgba(255,255,255,.4));
  --glass-edge: rgba(255,255,255,.75);
  --glass-shine: rgba(255,255,255,.9);
  --glass-depth: 0 30px 60px -30px rgba(40, 20, 25, .55), 0 10px 22px -12px rgba(40, 20, 25, .35);
  --veil: linear-gradient(180deg, rgba(255,250,245,.08), rgba(255,250,245,.22));
  --price: #7A5A22;
  --solid-bg: #241B1E;
  --solid-ink: #FBF6EF;
  --btn-glass: rgba(255,255,255,.42);
  color-scheme: light;
}
/* smoked glass over dark paintings */
[data-tone="dark"] {
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
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 128px; -webkit-text-size-adjust: 100%; background: #2b2226; }
body { margin: 0; color: var(--ink); font: 400 16px/1.45 var(--sans); -webkit-font-smoothing: antialiased; }
img { display: block; max-width: 100%; }
button { font: inherit; color: inherit; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--accent-hi); outline-offset: 3px; border-radius: 12px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---------- painting ---------- */
.scene { position: fixed; inset: 0; z-index: -1; overflow: hidden; }
.art {
  position: absolute; inset: -4%; opacity: 0; transition: opacity .8s ease;
  background: var(--src) center / cover no-repeat;
  animation: breathe 40s ease-in-out infinite alternate; will-change: transform;
}
[data-bg="lilies"] [data-art="lilies"], [data-bg="rhone"] [data-art="rhone"], [data-bg="flowers"] [data-art="flowers"],
[data-bg="poppies"] [data-art="poppies"], [data-bg="lace"] [data-art="lace"] { opacity: 1; }
[data-art="flowers"] { background-position: 40% 35%; }
[data-art="lace"] {
  background: var(--src) center / 220px repeat, radial-gradient(120% 80% at 30% 10%, #E2BFC2, #B98C93 55%, #8E5F68);
  animation: none;
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
[data-tone="dark"] .glass::before { opacity: .45; }

/* buttons: clear glass by default, a solid ink pill for the selected/primary one */
.btn-glass {
  color: var(--ink); background: var(--btn-glass); border: 1px solid var(--glass-edge);
  box-shadow: 0 1px 0 var(--glass-shine) inset, 0 8px 20px -12px rgba(0,0,0,.5);
  backdrop-filter: blur(16px) saturate(1.8); -webkit-backdrop-filter: blur(16px) saturate(1.8);
}
.solid {
  color: var(--solid-ink); background: var(--solid-bg); border: 1px solid transparent;
  box-shadow: 0 1px 0 rgba(255,255,255,.14) inset, 0 12px 24px -12px rgba(0,0,0,.6);
}
.btn {
  display: inline-flex; align-items: center; gap: 10px; padding: 13px 26px; border-radius: 999px;
  text-decoration: none; font-weight: 500; font-size: 15px; letter-spacing: .04em; transition: transform .15s ease, opacity .15s ease;
}
.btn:active { transform: scale(.97); opacity: .9; }

/* ---------- hero ---------- */
.hero { display: flex; flex-direction: column; align-items: center; padding: 40px 16px 22px; text-align: center; }
.medallion {
  width: 180px; height: 180px; border-radius: 50%; padding: 12px; margin-bottom: -40px; z-index: 1;
  animation: float 6s ease-in-out infinite alternate;
}
@keyframes float { from { transform: translateY(0); } to { transform: translateY(-6px); } }
.logo { width: 100%; height: 100%; border-radius: 50%; mix-blend-mode: multiply; }
[data-tone="dark"] .logo { filter: invert(1); mix-blend-mode: screen; }
.logo-text { display: grid; place-items: center; height: 100%; font: 48px/1 var(--serif); }
.hero-card { width: min(420px, 100%); border-radius: 28px; padding: 58px 20px 26px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.tagline { margin: 0; font: 23px/1.25 var(--serif); }
.hours { margin: 0 0 18px; color: var(--muted); font-size: 15px; letter-spacing: .03em; }

/* ---------- sticky nav ---------- */
.bar { position: sticky; top: 0; z-index: 5; padding: 10px 0 0; }
.bar::before {
  content: ''; position: absolute; inset: 0 0 -8px; z-index: -1; opacity: 0; transition: opacity .25s ease;
  background: linear-gradient(180deg, rgba(0,0,0,.18), rgba(0,0,0,0));
  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
  mask-image: linear-gradient(180deg, #000 80%, transparent); -webkit-mask-image: linear-gradient(180deg, #000 80%, transparent);
}
.bar.stuck::before { opacity: 1; }
.tabs { display: grid; grid-template-columns: 1fr 1fr; width: min(300px, calc(100% - 32px)); margin: 0 auto; padding: 4px; border-radius: 999px; }
.tab {
  position: relative; z-index: 1; text-align: center; text-decoration: none; padding: 9px 0;
  font-weight: 500; font-size: 15.5px; letter-spacing: .05em; color: var(--muted); transition: color .25s ease;
}
.tab[aria-selected="true"] { color: var(--solid-ink); }
.tab-thumb {
  position: absolute; z-index: 0; top: 4px; bottom: 4px; left: 4px; width: calc(50% - 4px); border-radius: 999px;
  transition: transform .4s cubic-bezier(.3,1.2,.5,1);
}
.tabs[data-active="1"] .tab-thumb { transform: translateX(100%); }
.chips { display: flex; gap: 8px; overflow-x: auto; padding: 12px 16px 14px; scrollbar-width: none; scroll-padding-inline: 16px; }
.chips::-webkit-scrollbar { display: none; }
.chip {
  flex: none; text-decoration: none; white-space: nowrap; font-size: 14.5px; font-weight: 400; letter-spacing: .03em;
  padding: 8px 16px; border-radius: 999px; color: var(--ink);
  background: var(--btn-glass); border: 1px solid var(--glass-edge);
  box-shadow: 0 1px 0 var(--glass-shine) inset;
  backdrop-filter: blur(12px) saturate(1.6); -webkit-backdrop-filter: blur(12px) saturate(1.6);
  transition: background .2s ease, color .2s ease;
}
.chip.on { color: var(--solid-ink); background: var(--solid-bg); border-color: transparent; box-shadow: 0 8px 18px -10px rgba(0,0,0,.6); }
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
.thumb { flex: none; width: 52px; height: 52px; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 16px -8px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.5) inset; background: rgba(255,255,255,.5); }
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb:empty { background: transparent; box-shadow: none; }
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

.foot { display: flex; justify-content: center; padding: 18px 16px calc(96px + env(safe-area-inset-bottom)); }
.foot-note { margin: 0; padding: 10px 18px; border-radius: 999px; font-size: 13.5px; color: var(--muted); }
.empty { text-align: center; padding: 40px 16px; border-radius: 30px; }

/* ---------- background picker ---------- */
.bg-picker { position: fixed; right: 14px; bottom: calc(14px + env(safe-area-inset-bottom)); z-index: 20; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.bg-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 11px 17px; border-radius: 999px; cursor: pointer; font-weight: 500; font-size: 14px; letter-spacing: .04em; }
.bg-panel { width: min(330px, calc(100vw - 28px)); border-radius: 24px; padding: 14px; }
.bg-panel[hidden] { display: none; }
.bg-title { margin: 0 4px 10px; font-weight: 600; font-size: 14px; }
.bg-list { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.bg-opt { all: unset; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; text-align: center; }
.bg-swatch {
  width: 52px; height: 52px; border-radius: 50%; background-size: cover; background-position: center;
  box-shadow: 0 0 0 2px rgba(255,255,255,.7), 0 8px 14px -6px rgba(0,0,0,.6);
  transition: transform .2s ease, box-shadow .2s ease;
}
.bg-opt[aria-pressed="true"] .bg-swatch { transform: scale(1.08); box-shadow: 0 0 0 3px var(--solid-bg), 0 0 0 5px rgba(255,255,255,.8), 0 10px 18px -6px rgba(0,0,0,.6); }
.bg-name { font-size: 10.5px; line-height: 1.2; color: var(--ink); }

/* ---------- detail sheet ---------- */
.sheet {
  position: fixed; width: min(560px, 100%); max-width: 100%; max-height: 92dvh; margin: auto auto 0; padding: 0; color: var(--ink);
  border-bottom: 0; border-radius: 30px 30px 0 0; overflow: auto;
}
@media (min-width: 640px) { .sheet { margin: auto; border-radius: 30px; border-bottom: 1px solid var(--glass-edge); } }
.sheet::backdrop { background: rgba(20, 10, 14, .35); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
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
  .art, .medallion, .sheet[open] { animation: none; }
  .tab-thumb, .art { transition: none; }
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
    bar.classList.toggle('stuck', window.scrollY >= hero.offsetHeight - 1);
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

  // background picker (remembered on this phone)
  var toggle = document.querySelector('.bg-toggle');
  var panel = document.getElementById('bg-panel');
  var opts = [].slice.call(document.querySelectorAll('.bg-opt'));
  function setBg(id, tone) {
    root.dataset.bg = id;
    root.dataset.tone = tone;
    opts.forEach(function (o) { o.setAttribute('aria-pressed', String(o.dataset.bg === id)); });
    try { localStorage.setItem('dunai-bg', id); } catch (e) {}
  }
  opts.forEach(function (o) {
    if (o.dataset.bg === root.dataset.bg) setBg(o.dataset.bg, o.dataset.toneOf);
    o.addEventListener('click', function () { setBg(o.dataset.bg, o.dataset.toneOf); });
  });
  toggle.addEventListener('click', function () {
    var open = panel.hidden;
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
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
