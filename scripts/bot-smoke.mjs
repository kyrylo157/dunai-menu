// Drives the bot through the main flows against `wrangler dev` (with TG_DRY=1 in .dev.vars).
// usage: node scripts/bot-smoke.mjs <origin> <WEBHOOK_SECRET> <ADMIN_PASSWORD>
import { execSync } from 'node:child_process';

const [origin, secret, password] = process.argv.slice(2);
const CHAT = 424242;
let uid = 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(update) {
  const res = await fetch(`${origin}/tg/${secret}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ update_id: uid++, ...update }),
  });
  if (!res.ok) throw new Error(`webhook ${res.status}`);
  await sleep(400);
}
const say = (text) => post({ message: { message_id: uid, chat: { id: CHAT }, from: { id: CHAT, first_name: 'Test' }, text } });
const tap = (data) => post({ callback_query: { id: String(uid), from: { id: CHAT }, data, message: { message_id: 1, chat: { id: CHAT } } } });

function sql(q) {
  const out = execSync(`npx wrangler d1 execute dunai-menu --local --json --command "${q}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(out)[0].results;
}

const results = [];
function check(name, ok) {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}`);
}

await say('/start');
await say('wrong');
check('wrong password does not grant access', sql(`SELECT * FROM admins WHERE chat_id = ${CHAT}`).length === 0);
await say(password);
check('password grants access', sql(`SELECT * FROM admins WHERE chat_id = ${CHAT}`).length === 1);

await say('📋 Меню');
await tap('sec:kitchen');
const pizza = sql("SELECT id FROM categories WHERE name = 'Піца'")[0].id;
await tap(`cat:${pizza}:0`);
const pep = sql("SELECT id FROM items WHERE name = 'Піца Пепероні'")[0].id;

await tap(`if:price:${pep}`);
await say('abc');
await say('275 грн');
check('price edit', sql(`SELECT price FROM items WHERE id = ${pep}`)[0].price === 275);

await tap(`if:description:${pep}`);
await say('Томатний соус, моцарела, пепероні');
check('description edit', sql(`SELECT description FROM items WHERE id = ${pep}`)[0].description === 'Томатний соус, моцарела, пепероні');

await tap(`ibadge:hit:${pep}`);
check('hit badge on', sql(`SELECT badge FROM items WHERE id = ${pep}`)[0].badge === 'hit');
await tap(`ihide:${pep}`);
check('stop-list on', sql(`SELECT hidden FROM items WHERE id = ${pep}`)[0].hidden === 1);
await tap(`ihide:${pep}`);
check('stop-list off', sql(`SELECT hidden FROM items WHERE id = ${pep}`)[0].hidden === 0);

await tap('catnew:kitchen');
await say('Сезонне');
const season = sql("SELECT id, section FROM categories WHERE name = 'Сезонне'")[0];
check('category created in kitchen', season?.section === 'kitchen');

await tap(`itemnew:${season.id}`);
await say('Гарбузовий суп');
await say('150');
await say('300 г');
await say('-');
const soup = sql("SELECT * FROM items WHERE name = 'Гарбузовий суп'")[0];
check('item created via wizard', soup?.price === 150 && soup.weight === '300 г' && soup.category_id === season.id);

await tap(`imoveto:${soup.id}:${pizza}`);
check('item moved', sql(`SELECT category_id FROM items WHERE id = ${soup.id}`)[0].category_id === pizza);

await tap(`catren:${season.id}`);
await say('Осіннє меню');
check('category renamed', sql(`SELECT name FROM categories WHERE id = ${season.id}`)[0].name === 'Осіннє меню');

await tap(`catdelok:${season.id}`);
check('category deleted', sql(`SELECT id FROM categories WHERE id = ${season.id}`).length === 0);

await tap(`idelok:${soup.id}`);
check('item deleted', sql(`SELECT id FROM items WHERE id = ${soup.id}`).length === 0);

await say('борщ');
await tap('set:hours');
await say('Щодня з 9:00 до 23:00');
check('setting saved', sql("SELECT value FROM settings WHERE key = 'hours'")[0].value === 'Щодня з 9:00 до 23:00');

const html = await (await fetch(origin)).text();
check('site shows new price and badge', html.includes('275 ₴') && html.includes('Хіт') && html.includes('9:00'));

// restore the seed values touched above
sql(`UPDATE items SET price = 260, badge = NULL, description = NULL WHERE id = ${pep}`);
sql("UPDATE settings SET value = 'Щодня з 10:00 до 23:00' WHERE key = 'hours'");
sql(`DELETE FROM admins WHERE chat_id = ${CHAT}`);
sql(`DELETE FROM sessions WHERE chat_id = ${CHAT}`);

console.log(results.join('\n'));
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
