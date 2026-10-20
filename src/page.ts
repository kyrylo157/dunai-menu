import { photoUrl, priceText, type Category, type Item, type Section, type Settings } from './db';

const h = (s: string | null | undefined) =>
  (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SECTIONS: [Section, string][] = [['kitchen', 'Кухня'], ['bar', 'Бар']];
const BADGE: Record<string, string> = { hit: 'Рекомендуємо', new: 'Новинка' };

/** Smooth sine path repeated `periods` times; drawn twice as wide so it can loop by translating -50%. */
function wave(y: number, amp: number, period: number, periods: number) {
  let d = `M0 ${y}`;
  for (let i = 0; i < periods * 2; i++) {
    const x = i * (period / 2);
    d += ` Q${x + period / 4} ${i % 2 ? y + amp : y - amp} ${x + period / 2} ${y}`;
  }
  return d;
}

/** The Danube motif: a few thin brass currents. */
function river(cls: string, lines: { y: number; amp: number; period: number; o: number; s: number }[], width = 1200, height = 120) {
  const paths = lines.map((l, i) =>
    `<path class="current" pathLength="1" style="--o:${l.o};--s:${l.s}s;--i:${i}" d="${wave(l.y, l.amp, l.period, (width * 2) / l.period)}"/>`).join('');
  return `<svg class="${cls}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g class="flow">${paths}</g></svg>`;
}

const ORNAMENT = river('ornament', [
  { y: 10, amp: 3, period: 40, o: 0.9, s: 0 },
], 120, 20);

function badge(it: Item) {
  return it.badge && BADGE[it.badge] ? `<span class="badge">${BADGE[it.badge]}</span>` : '';
}

function tapAttrs(it: Item) {
  return it.photo || it.description ? ` data-id="${it.id}"` : '';
}

function card(it: Item) {
  const src = photoUrl(it.photo)!;
  return `<li><button class="dish" type="button"${tapAttrs(it)}>
  <span class="frame"><img src="${h(src)}" alt="" loading="lazy" decoding="async" width="400" height="400"></span>
  ${badge(it)}
  <span class="dish-name">${h(it.name)}</span>
  ${it.description ? `<span class="dish-desc">${h(it.description)}</span>` : ''}
  <span class="dish-meta">${it.weight ? `<span class="weight">${h(it.weight)}</span>` : ''}<span class="price">${priceText(it.price)}</span></span>
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
  const sub = [it.weight, it.description].filter(Boolean).map(h).join(' · ');
  return `<li><${open} class="row"${tapAttrs(it)}>${thumb}
  <span class="row-main">
    <span class="row-line"><span class="row-name">${h(it.name)}</span><span class="leader" aria-hidden="true"></span><span class="price">${priceText(it.price)}</span></span>
    ${sub || it.badge ? `<span class="row-sub">${badge(it)}${sub}</span>` : ''}
  </span>
</${close}></li>`;
}

function categoryBlock(c: Category, list: Item[]) {
  let body: string;
  if (c.layout === 'cards') {
    const withPhoto = list.filter((i) => i.photo);
    const without = list.filter((i) => !i.photo);
    body = (withPhoto.length ? `<ul class="dishes">${withPhoto.map(card).join('')}</ul>` : '')
      + (without.length ? `<ul class="rows">${without.map((i) => row(i, false)).join('')}</ul>` : '');
  } else {
    const thumbs = list.some((i) => i.photo);
    body = `<ul class="rows">${list.map((i) => row(i, thumbs)).join('')}</ul>`;
  }
  return `<section class="cat" id="c${c.id}" aria-labelledby="c${c.id}-t">
  <header class="cat-head">
    <h2 class="cat-title" id="c${c.id}-t">${h(c.name)}</h2>
    ${ORNAMENT}
  </header>
  ${body}
</section>`;
}

const INSTA_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor"/></svg>`;

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
        `<a class="tab" role="tab" href="#${sec}" data-tab="${sec}" aria-selected="${i === 0}">${label}</a>`).join('<span class="tab-sep" aria-hidden="true"></span>')}</div>`
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
    ? `<a class="btn-line" href="${h(s.instagram)}" target="_blank" rel="noopener">${INSTA_ICON}<span>Instagram</span></a>`
    : '';

  const heroRiver = river('river', [
    { y: 40, amp: 7, period: 300, o: 0.55, s: 38 },
    { y: 56, amp: 5, period: 240, o: 0.35, s: 30 },
    { y: 70, amp: 8, period: 400, o: 0.25, s: 46 },
    { y: 84, amp: 4, period: 200, o: 0.18, s: 26 },
  ]);

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
<meta name="theme-color" content="#0F1D1F">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Commissioner:wght@300;400;500&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header class="hero">
  <div class="glow" aria-hidden="true"></div>
  <div class="hero-inner">
    <div class="seal">
      ${logo ? `<img class="logo" src="${h(logo)}" alt="${h(name)} family restaurant" width="200" height="200">` : `<span class="logo-text">${h(name)}</span>`}
    </div>
    <h1 class="visually-hidden">Меню ресторану ${h(name)}</h1>
    ${s.tagline ? `<p class="tagline">${h(s.tagline)}</p>` : ''}
    ${s.hours ? `<p class="hours">${h(s.hours)}</p>` : ''}
    ${insta}
  </div>
  ${heroRiver}
</header>

<nav class="bar" aria-label="Розділи меню">
  ${tabs}
  ${chips}
</nav>

<main>
${sections || '<p class="empty">Меню оновлюється. Загляньте трохи пізніше.</p>'}
</main>

<footer class="foot">
  ${logo ? `<img class="foot-logo" src="${h(logo)}" alt="" width="72" height="72">` : ''}
  <p>Ціни вказані в гривнях</p>
  ${insta}
</footer>

<dialog class="sheet" id="sheet" aria-labelledby="sheet-name">
  <form method="dialog"><button class="sheet-close" aria-label="Закрити">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
  </button></form>
  <span class="frame sheet-frame" hidden><img class="sheet-img" alt=""></span>
  <div class="sheet-body">
    <h3 class="sheet-name" id="sheet-name"></h3>
    ${ORNAMENT}
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
  --river: #0F1D1F;
  --river-2: #13262A;
  --surface: #172C30;
  --ivory: #F1EADB;
  --mist: #A3ABA4;
  --brass: #C9A762;
  --brass-hi: #E6CF97;
  --brass-lo: #8E7239;
  --hair: rgba(201, 167, 98, .28);
  --serif: 'Cormorant Garamond', 'Times New Roman', serif;
  --sans: 'Commissioner', system-ui, sans-serif;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 118px; -webkit-text-size-adjust: 100%; background: var(--river); }
body {
  margin: 0; color: var(--ivory); background: var(--river);
  font: 300 16px/1.55 var(--sans); letter-spacing: .01em;
  -webkit-font-smoothing: antialiased;
}
/* faint paper grain so the dark isn't flat */
body::before {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: .5;
  background:
    radial-gradient(120% 60% at 50% 0%, rgba(201,167,98,.07), transparent 60%),
    radial-gradient(90% 50% at 100% 100%, rgba(60,110,112,.18), transparent 70%);
}
img { display: block; max-width: 100%; }
button { font: inherit; color: inherit; }
a { color: inherit; }
:focus-visible { outline: 1px solid var(--brass); outline-offset: 4px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ---------- hero ---------- */
.hero {
  position: relative; overflow: hidden; min-height: min(80svh, 720px);
  display: grid; place-items: center; padding: 56px 20px 120px; text-align: center;
  background: linear-gradient(180deg, var(--river-2), var(--river));
}
.glow {
  position: absolute; left: 50%; top: 38%; width: 560px; height: 560px; translate: -50% -50%;
  background: radial-gradient(closest-side, rgba(230,207,151,.16), rgba(230,207,151,.05) 55%, transparent);
  animation: candle 7s ease-in-out infinite alternate;
}
@keyframes candle { from { opacity: .75; scale: .96; } to { opacity: 1; scale: 1.04; } }
.hero-inner { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; animation: rise 1.4s cubic-bezier(.2,.7,.2,1) both; }
@keyframes rise { from { opacity: 0; transform: translateY(14px); } }
/* the seal has its own dark disc so the inverted logo's black can blend away inside it */
.seal {
  position: relative; width: 196px; height: 196px; border-radius: 50%; margin-bottom: 26px;
  display: grid; place-items: center;
  background: radial-gradient(circle at 50% 38%, #1D3438, #11222500 140%), var(--river-2);
  box-shadow: 0 30px 60px -30px rgba(0,0,0,.9);
}
/* double brass ring */
.seal::before, .seal::after { content: ''; position: absolute; border-radius: 50%; pointer-events: none; }
.seal::before { inset: -10px; border: 1px solid var(--hair); }
.seal::after { inset: -18px; border: 1px solid rgba(201,167,98,.12); }
.logo { width: 100%; height: 100%; border-radius: 50%; filter: invert(1) sepia(.35) saturate(1.4) hue-rotate(5deg) brightness(.98); mix-blend-mode: screen; }
.logo-text { font: italic 500 64px/1 var(--serif); color: var(--ivory); }
.tagline { margin: 0; font: italic 400 26px/1.2 var(--serif); color: var(--ivory); letter-spacing: .01em; }
.hours { margin: 0 0 22px; color: var(--mist); font-size: 14px; letter-spacing: .04em; }
.btn-line {
  display: inline-flex; align-items: center; gap: 10px; padding: 11px 26px;
  border: 1px solid var(--brass); color: var(--brass-hi); text-decoration: none;
  font-size: 14px; font-weight: 400; letter-spacing: .08em; border-radius: 999px;
  background: linear-gradient(180deg, rgba(201,167,98,.10), rgba(201,167,98,0));
  transition: background .25s ease, color .25s ease;
}
.btn-line:hover, .btn-line:active { background: var(--brass); color: var(--river); }

/* the Danube: brass currents drifting slowly */
.river { position: absolute; left: 0; bottom: 18px; width: 100%; height: 110px; overflow: hidden; }
.current { fill: none; stroke: var(--brass); stroke-width: 1; vector-effect: non-scaling-stroke; opacity: var(--o); stroke-dasharray: 1; }
/* each path is two copies wide: draw it in once, then slide it left by one copy forever */
.river .current {
  stroke-dashoffset: 1; transform-box: fill-box;
  animation: draw 2.6s cubic-bezier(.4,0,.2,1) calc(.3s + var(--i) * .18s) forwards, flow var(--s) linear infinite;
}
@keyframes draw { to { stroke-dashoffset: 0; } }
@keyframes flow { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* ---------- sticky nav ---------- */
.bar {
  position: sticky; top: 0; z-index: 5;
  background: color-mix(in srgb, var(--river) 88%, transparent);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--hair);
}
.tabs { display: flex; justify-content: center; align-items: center; gap: 22px; padding: 14px 16px 2px; }
.tab {
  font: italic 500 25px/1.1 var(--serif); text-decoration: none; color: var(--mist);
  padding: 2px 2px 6px; position: relative; transition: color .3s ease;
}
.tab::after {
  content: ''; position: absolute; left: 50%; bottom: 0; width: 0; height: 1px; background: var(--brass);
  transition: width .35s ease, left .35s ease;
}
.tab[aria-selected="true"] { color: var(--ivory); }
.tab[aria-selected="true"]::after { width: 100%; left: 0; }
.tab-sep { width: 5px; height: 5px; rotate: 45deg; border: 1px solid var(--brass); opacity: .7; }
.chips {
  display: flex; gap: 22px; overflow-x: auto; padding: 10px 20px 12px;
  scrollbar-width: none; scroll-padding-inline: 20px;
}
.chips::-webkit-scrollbar { display: none; }
.chip {
  flex: none; position: relative; text-decoration: none; white-space: nowrap;
  font-size: 13.5px; letter-spacing: .05em; color: var(--mist); padding: 4px 0 6px; transition: color .25s ease;
}
.chip::before {
  content: ''; position: absolute; left: 50%; bottom: 0; width: 4px; height: 4px; translate: -50% 0; rotate: 45deg;
  background: var(--brass); opacity: 0; transition: opacity .25s ease;
}
.chip.on { color: var(--brass-hi); }
.chip.on::before { opacity: 1; }
.js [data-chips]:not(.on), .js .section:not(.on) { display: none; }

/* ---------- menu ---------- */
main { max-width: 820px; margin: 0 auto; padding: 0 20px 40px; }
.cat { padding-top: 64px; }
.cat-head { display: flex; flex-direction: column; align-items: center; margin-bottom: 34px; }
.cat-title { margin: 0; font: italic 500 44px/1.05 var(--serif); color: var(--ivory); text-align: center; letter-spacing: .005em; }
.ornament { width: 84px; height: 14px; margin-top: 12px; }
.ornament .current { stroke-width: 1.2; opacity: .9; }

/* dishes with photos: framed like small paintings */
.dishes { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 40px 18px; }
@media (min-width: 680px) { .dishes { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 48px 26px; } }
.dish {
  all: unset; box-sizing: border-box; position: relative; display: flex; flex-direction: column; align-items: center;
  text-align: center; width: 100%; height: 100%; cursor: pointer; -webkit-tap-highlight-color: transparent;
}
.dish:not([data-id]) { cursor: default; }
.frame {
  position: relative; display: block; width: 100%; aspect-ratio: 4 / 5; margin-bottom: 16px;
  border-radius: 999px 999px 4px 4px; overflow: hidden;
  box-shadow: 0 30px 40px -24px rgba(0,0,0,.8);
}
/* inner brass hairline */
.frame::after {
  content: ''; position: absolute; inset: 7px; border-radius: inherit; pointer-events: none;
  border: 1px solid rgba(230,207,151,.55);
}
.frame img { width: 100%; height: 100%; object-fit: cover; filter: saturate(1.05) contrast(1.03); transition: transform 1.2s cubic-bezier(.2,.7,.2,1); }
.dish[data-id]:active .frame img { transform: scale(1.04); }
@media (hover: hover) { .dish[data-id]:hover .frame img { transform: scale(1.05); } }
.dish .badge { margin: 0 0 8px; }
.dish-name { font: 400 15.5px/1.35 var(--sans); letter-spacing: .03em; color: var(--ivory); padding: 0 4px; }
.dish-desc {
  margin-top: 6px; color: var(--mist); font-size: 13px; line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.dish-meta { display: flex; align-items: baseline; justify-content: center; gap: 12px; margin-top: auto; padding-top: 10px; }
.weight { color: var(--mist); font-size: 12.5px; letter-spacing: .05em; }
.price { font: 500 21px/1 var(--serif); color: var(--brass-hi); white-space: nowrap; font-variant-numeric: lining-nums tabular-nums; }

/* list rows: classic printed menu with brass leaders */
.rows { list-style: none; margin: 0; padding: 0; }
.dishes + .rows { margin-top: 44px; }
.row {
  all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 16px; width: 100%;
  padding: 15px 0; -webkit-tap-highlight-color: transparent;
}
button.row { cursor: pointer; }
.thumb {
  flex: none; width: 54px; height: 54px; border-radius: 50%; overflow: hidden; position: relative;
  box-shadow: 0 0 0 1px var(--hair), 0 0 0 4px var(--river), 0 0 0 5px rgba(201,167,98,.15);
  background: var(--river);
}
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb:empty { box-shadow: none; background: transparent; }
.row-main { flex: 1; min-width: 0; }
.row-line { display: flex; align-items: baseline; gap: 10px; }
.row-name { font: 400 15.5px/1.35 var(--sans); letter-spacing: .03em; color: var(--ivory); }
.leader { flex: 1; min-width: 18px; border-bottom: 1px dotted rgba(201,167,98,.45); transform: translateY(-5px); }
.row-sub { display: block; color: var(--mist); font-size: 13px; margin-top: 3px; }
.row-sub .badge { margin-right: 8px; }

.badge {
  display: inline-block; font: italic 500 14px/1 var(--serif); color: var(--brass-hi);
  padding: 4px 12px; border: 1px solid var(--hair); border-radius: 999px; vertical-align: 1px;
}

.foot {
  display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center;
  color: var(--mist); font-size: 13px; letter-spacing: .04em;
  padding: 56px 20px calc(56px + env(safe-area-inset-bottom)); border-top: 1px solid var(--hair);
  max-width: 820px; margin: 24px auto 0;
}
.foot p { margin: 0; }
.foot-logo { width: 72px; height: 72px; border-radius: 50%; filter: invert(1) sepia(.35) saturate(1.4); mix-blend-mode: screen; opacity: .8; }
.empty { text-align: center; color: var(--mist); padding: 64px 0; font: italic 22px var(--serif); }

/* ---------- detail sheet ---------- */
.sheet {
  width: min(540px, 100%); max-width: 100%; max-height: 94dvh; margin: auto auto 0; padding: 0;
  border: 1px solid var(--hair); border-bottom: 0; border-radius: 28px 28px 0 0;
  background: linear-gradient(180deg, var(--surface), var(--river)); color: var(--ivory); overflow: auto;
  box-shadow: 0 -30px 80px -20px rgba(0,0,0,.8);
}
@media (min-width: 640px) { .sheet { margin: auto; border-radius: 28px; border-bottom: 1px solid var(--hair); } }
.sheet::backdrop { background: rgba(5, 12, 13, .72); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
.sheet[open] { animation: up .45s cubic-bezier(.2,.8,.2,1); }
@keyframes up { from { transform: translateY(70px); opacity: 0; } }
.sheet-close {
  position: absolute; right: 16px; top: 16px; z-index: 2; width: 42px; height: 42px; border-radius: 50%;
  display: grid; place-items: center; cursor: pointer; color: var(--ivory);
  background: rgba(15,29,31,.6); border: 1px solid var(--hair);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
}
.sheet-frame { width: auto; margin: 18px 18px 0; aspect-ratio: 1; border-radius: 999px 999px 6px 6px; }
.sheet-frame[hidden] { display: none; }
.sheet-body { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 22px 26px calc(30px + env(safe-area-inset-bottom)); }
.sheet-name { margin: 0 40px; font: italic 500 32px/1.1 var(--serif); }
.sheet-frame:not([hidden]) + .sheet-body .sheet-name { margin: 0; }
.sheet-desc { margin: 14px 0 0; color: var(--mist); font-size: 15px; max-width: 42ch; }
.sheet-desc:empty { display: none; }
.sheet-foot { display: flex; gap: 16px; align-items: baseline; margin: 18px 0 0; }
.sheet-foot .price { font-size: 26px; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .glow, .hero-inner, .sheet[open] { animation: none; }
  .river .current { animation: none; stroke-dashoffset: 0; }
  .frame img, .tab::after { transition: none; }
}
`;

const JS = /* js */ `
(function () {
  document.documentElement.classList.add('js');
  var tabs = [].slice.call(document.querySelectorAll('[data-tab]'));
  var sections = [].slice.call(document.querySelectorAll('[data-section]'));
  var chipRows = [].slice.call(document.querySelectorAll('[data-chips]'));
  var bar = document.querySelector('.bar');
  var hero = document.querySelector('.hero');

  function select(sec, scroll) {
    if (!sections.some(function (s) { return s.dataset.section === sec; })) sec = sections[0] && sections[0].dataset.section;
    tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.tab === sec)); });
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

  // highlight the category being read and keep its link in view
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
    var line = bar.offsetHeight + 40;
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

  // dish detail sheet
  var sheet = document.getElementById('sheet');
  if (!sheet || !sheet.showModal) return;
  var frame = sheet.querySelector('.sheet-frame');
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
    if (it.i) { img.src = it.i; frame.hidden = false; } else { img.removeAttribute('src'); frame.hidden = true; }
    sheet.showModal();
  });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
})();
`;
