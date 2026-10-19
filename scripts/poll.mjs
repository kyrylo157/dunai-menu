// Local development: pulls updates from Telegram and forwards them to `wrangler dev`,
// so the bot works without a public webhook URL. Removes any webhook first.
// usage: node scripts/poll.mjs <origin> <BOT_TOKEN> <WEBHOOK_SECRET>
const [origin, token, secret] = process.argv.slice(2);
const api = (m, body) =>
  fetch(`https://api.telegram.org/bot${token}/${m}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}),
  }).then((r) => r.json());

await api('deleteWebhook', {});
console.log('polling… (Ctrl+C to stop)');
let offset = 0;
for (;;) {
  const r = await api('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] }).catch(() => null);
  for (const u of r?.result ?? []) {
    offset = u.update_id + 1;
    await fetch(`${origin}/tg/${secret}`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret }, body: JSON.stringify(u),
    }).catch((e) => console.error('forward failed', e.message));
  }
}
