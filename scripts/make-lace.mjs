// Generates public/bg/lace.svg: a seamless tile of doily rosettes over a fine tulle net.
import { writeFileSync } from 'node:fs';

const T = 240; // tile size
const f = (n) => +n.toFixed(2);

function rosette(cx, cy, r) {
  const out = [];
  // scalloped rim
  const sc = 24;
  let d = '';
  for (let i = 0; i <= sc; i++) {
    const a = (i / sc) * Math.PI * 2;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) d += `M${f(x)} ${f(y)}`;
    else d += ` A${f(r * 0.14)} ${f(r * 0.14)} 0 0 1 ${f(x)} ${f(y)}`;
  }
  out.push(`<path d="${d}" class="w"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f(r * 0.86)}" class="t"/>`);
  // ring of holes
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    out.push(`<circle cx="${f(cx + Math.cos(a) * r * 0.76)}" cy="${f(cy + Math.sin(a) * r * 0.76)}" r="${f(r * 0.045)}" class="t"/>`);
  }
  // petals
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 360;
    out.push(`<ellipse cx="${cx}" cy="${f(cy - r * 0.45)}" rx="${f(r * 0.12)}" ry="${f(r * 0.24)}" transform="rotate(${a} ${cx} ${cy})" class="w"/>`);
    out.push(`<line x1="${cx}" y1="${f(cy - r * 0.2)}" x2="${cx}" y2="${f(cy - r * 0.66)}" transform="rotate(${a + 15} ${cx} ${cy})" class="t"/>`);
  }
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f(r * 0.2)}" class="w"/>`);
  out.push(`<circle cx="${cx}" cy="${cy}" r="${f(r * 0.1)}" class="t"/>`);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    out.push(`<circle cx="${f(cx + Math.cos(a) * r * 0.15)}" cy="${f(cy + Math.sin(a) * r * 0.15)}" r="${f(r * 0.025)}" class="dot"/>`);
  }
  return out.join('');
}

const R = T * 0.3;
const rosettes = [
  rosette(T / 2, T / 2, R),
  // quarter rosettes on the corners make the tile seamless
  rosette(0, 0, R * 0.62), rosette(T, 0, R * 0.62), rosette(0, T, R * 0.62), rosette(T, T, R * 0.62),
].join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">
<defs>
  <pattern id="net" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <path d="M0 0H8M0 0V8" stroke="#fff" stroke-opacity=".16" stroke-width=".6"/>
  </pattern>
  <filter id="lift" x="-10%" y="-10%" width="120%" height="120%">
    <feDropShadow dx="0" dy="1.2" stdDeviation="1" flood-color="#5a2e36" flood-opacity=".45"/>
  </filter>
  <style>.w{fill:none;stroke:#fff;stroke-opacity:.85;stroke-width:1.3}.t{fill:none;stroke:#fff;stroke-opacity:.55;stroke-width:.8}.dot{fill:#fff;fill-opacity:.8}</style>
</defs>
<rect width="${T}" height="${T}" fill="url(#net)"/>
<g filter="url(#lift)">${rosettes}</g>
</svg>`;

writeFileSync(new URL('../public/bg/lace.svg', import.meta.url), svg);
console.log('lace.svg', svg.length, 'bytes');
