// Cuts the subject out of a photo and writes a transparent PNG.
// Runs in its own process: onnxruntime crashes when sharp is loaded next to it.
// usage: node scripts/cutout.mjs <in.jpg> <out.png>
import { readFileSync, writeFileSync } from 'node:fs';
import { removeBackground } from '@imgly/background-removal-node';

const [src, out] = process.argv.slice(2);
const blob = new Blob([readFileSync(src)], { type: 'image/jpeg' });
const res = await removeBackground(blob, { output: { format: 'image/png' } });
writeFileSync(out, Buffer.from(await res.arrayBuffer()));
