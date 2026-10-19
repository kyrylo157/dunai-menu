// Copies Poster photos into R2 batch by batch.
// usage: node scripts/import-photos.mjs <site origin> <WEBHOOK_SECRET>
const [origin, secret] = process.argv.slice(2);
if (!origin || !secret) {
  console.error('usage: node scripts/import-photos.mjs <origin> <secret>');
  process.exit(1);
}
for (;;) {
  const res = await fetch(`${origin}/admin/import-photos`, { method: 'POST', headers: { 'x-secret': secret } });
  const r = await res.json();
  console.log(`imported ${r.done}, failed ${r.failed.length}, left ${r.left}`);
  if (!r.left || !r.done) break;
}
