// Finds kitchen photos shot on a plain white background, cuts the dish out with a local
// segmentation model and places it on a dark painterly backdrop made from the site's background.
// usage:
//   node scripts/restyle-photos.mjs <origin> <out dir>                 → previews only
//   node scripts/restyle-photos.mjs <origin> <out dir> <secret> apply  → also uploads them
import { execSync, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const [origin, outDir, secret, mode] = process.argv.slice(2);
if (!origin || !outDir) {
  console.error('usage: node scripts/restyle-photos.mjs <origin> <out dir> [secret apply]');
  process.exit(1);
}
const SIZE = 1024;
const backupDir = new URL('../data/photo-backup/', import.meta.url);
mkdirSync(backupDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const rows = JSON.parse(execSync(
  `npx wrangler d1 execute dunai-menu --remote --json --command "SELECT i.id, i.name, i.photo FROM items i JOIN categories c ON c.id = i.category_id WHERE c.section = 'kitchen' AND i.photo IS NOT NULL ORDER BY c.sort, i.sort"`,
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], cwd: new URL('..', import.meta.url) },
))[0].results;

/** Mean brightness and spread of the outer frame of the picture. */
async function borderStats(buf) {
  const { data, info } = await sharp(buf).resize(128, 128, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const vals = [];
  const b = 6;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (x >= b && x < info.width - b && y >= b && y < info.height - b) continue;
      const i = (y * info.width + x) * 3;
      vals.push((data[i] + data[i + 1] + data[i + 2]) / 3);
    }
  }
  const mean = vals.reduce((a, v) => a + v, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
  return { mean, sd };
}

let backdrop;
async function makeBackdrop() {
  const painting = readFileSync(new URL('../public/bg/flowers.jpg', import.meta.url));
  const base = await sharp(painting).resize(SIZE, SIZE, { fit: 'cover', position: 'centre' })
    .blur(36).modulate({ brightness: 0.42, saturation: 0.85 }).toBuffer();
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <defs>
      <radialGradient id="v" cx="50%" cy="42%" r="70%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".65"/></radialGradient>
      <linearGradient id="ledge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d15" stop-opacity=".0"/><stop offset=".02" stop-color="#3b2a1e" stop-opacity=".85"/><stop offset="1" stop-color="#140e0a" stop-opacity=".95"/></linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#v)"/>
    <rect y="${SIZE * 0.7}" width="100%" height="${SIZE * 0.3}" fill="url(#ledge)"/>
    <rect y="${SIZE * 0.7}" width="100%" height="2" fill="#f3d9b0" opacity=".14"/>
  </svg>`);
  return sharp(base).composite([{ input: overlay }]).toBuffer();
}

async function restyle(id) {
  backdrop ??= await makeBackdrop();
  const src = fileURLToPath(new URL(`${id}.jpg`, backupDir));
  const cutPath = join(outDir, `${id}-cut.png`);
  execFileSync(process.execPath, [fileURLToPath(new URL('cutout.mjs', import.meta.url)), src, cutPath], { stdio: 'ignore' });
  const cut = readFileSync(cutPath);
  const trimmed = await sharp(cut).trim({ threshold: 1 }).toBuffer();
  const fitted = await sharp(trimmed).resize(Math.round(SIZE * 0.74), Math.round(SIZE * 0.66), { fit: 'inside' }).toBuffer();
  const { width: w, height: hgt } = await sharp(fitted).metadata();
  const left = Math.round((SIZE - w) / 2);
  const bottom = Math.round(SIZE * 0.84);
  const top = bottom - hgt;
  const shadow = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <defs><filter id="b"><feGaussianBlur stdDeviation="12"/></filter></defs>
    <ellipse cx="${SIZE / 2}" cy="${bottom - 4}" rx="${w * 0.4}" ry="${Math.max(12, hgt * 0.035)}" fill="#000" opacity=".8" filter="url(#b)"/>
  </svg>`);
  return sharp(backdrop)
    .composite([{ input: shadow }, { input: fitted, left, top }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

const picked = [];
for (const r of rows) {
  if (/^https?:/.test(r.photo)) continue;
  const res = await fetch(`${origin}/img/${r.photo}`);
  if (!res.ok) { console.warn('skip', r.id, res.status); continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const backup = new URL(`${r.id}.jpg`, backupDir);
  if (!existsSync(backup)) writeFileSync(backup, buf);
  const { mean, sd } = await borderStats(buf);
  // RESTYLE_IDS=7,12 adds photos the border check misses (e.g. a package touching the edges)
  const forced = (process.env.RESTYLE_IDS ?? '').split(',').includes(String(r.id));
  if (!forced && (mean < 228 || sd > 22)) continue;
  console.log(`white background: #${r.id} ${r.name} (border ${mean.toFixed(0)}±${sd.toFixed(0)})`);
  const out = await restyle(r.id);
  writeFileSync(join(outDir, `${r.id}.jpg`), out);
  picked.push(r);
  if (mode === 'apply' && secret) {
    const up = await fetch(`${origin}/admin/photo?item=${r.id}`, { method: 'POST', headers: { 'x-secret': secret, 'content-type': 'image/jpeg' }, body: out });
    console.log('  uploaded', up.status, await up.text());
  }
}
console.log(`${picked.length} of ${rows.length} kitchen photos restyled`);
