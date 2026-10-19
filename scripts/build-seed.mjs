// Turns the Poster Shop export (data/poster-items.json) into seed/seed.sql:
// cleans names, moves dish weights into their own field, groups categories into kitchen/bar.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const raw = JSON.parse(readFileSync(new URL('../data/poster-items.json', import.meta.url), 'utf8'));

// order, section and layout for every Poster category; rename where the original is off
const CATEGORIES = [
  ['Сніданки', 'kitchen', 'cards'],
  ['Закуски', 'kitchen', 'cards'],
  ['Перші страви', 'kitchen', 'cards'],
  ['Салати', 'kitchen', 'cards'],
  ['Піца', 'kitchen', 'cards'],
  ['Бургери', 'kitchen', 'cards'],
  ['Основні страви', 'kitchen', 'cards'],
  ['Мангал', 'kitchen', 'cards'],
  ['Гарніри', 'kitchen', 'list'],
  ['Хліб', 'kitchen', 'list'],
  ['Десерти', 'kitchen', 'cards'],
  ['Дитяче меню', 'kitchen', 'list'],
  ['Кава', 'bar', 'list'],
  ['Чай', 'bar', 'list'],
  ['Холодні напої', 'bar', 'list'],
  ['Коктейлі', 'bar', 'list'],
  ['Пиво', 'bar', 'list'],
  ['Вино', 'bar', 'list'],
  ['Шампанське', 'bar', 'list'],
  ['Вермут', 'bar', 'list'],
  ['Слабоалкогольні напої', 'bar', 'list'],
  ['Горілка', 'bar', 'list'],
  ['Коньяк', 'bar', 'list'],
  ['Віскі', 'bar', 'list', 'Виски'],
  ['Ром', 'bar', 'list'],
  ['Джин', 'bar', 'list'],
  ['Текіла', 'bar', 'list'],
  ['Настоянки', 'bar', 'list', 'Настойка'],
  ['Кальян', 'bar', 'list', 'Послуги'],
];

const FIXES = [
  [/Папероні/g, 'Пепероні'],
  [/вішнею/g, 'вишнею'],
  [/Ірландский віскв/g, 'Ірландська кава'],
  [/Амерікано/g, 'Американо'],
  [/Текила/g, 'Текіла'],
  [/розивне/g, 'розливне'],
  [/Capitan/g, 'Captain'],
  [/classik/g, 'Classic'],
  [/Мохiто/g, 'Мохіто'],
  [/заварной/g, 'заварний'],
  [/`/g, '’'],
  [/Daniel's/g, 'Daniel’s'],
  [/\(/g, ' ('],
  [/,(?=[^\d\s])/g, ', '],
  [/Martell VS 0\.50/g, 'Martell VS 0,5 л'],
  [/Finlandia 0\.5 мл/g, 'Finlandia 0,5 л'],
  [/Pepsi 0\.5$/g, 'Pepsi 0,5 л'],
  [/Швепс/g, 'Schweppes'],
];

function clean(name) {
  let n = name.trim();
  for (const [re, to] of FIXES) n = n.replace(re, to);
  // volumes: "50ml" / "0.5л" / "25 мл" -> "50 мл" / "0,5 л"
  n = n.replace(/(\d)\s*(ml|мл)(?!\p{L})/giu, '$1 мл')
       .replace(/(\d)\.(\d)/g, '$1,$2')
       .replace(/(\d)\s*л(?!\p{L})/gu, '$1 л');
  // trailing dish weight in grams -> separate field
  let weight = null;
  const m = n.match(/\s*(\d+(?:\/\d+)*)\s*(?:гр|г)\.?$/);
  if (m) { weight = `${m[1]} г`; n = n.slice(0, m.index); }
  n = n.replace(/\s{2,}/g, ' ').replace(/\(\s+/g, '(').trim();
  return { name: n, weight };
}

const q = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

const lines = [];
CATEGORIES.forEach(([name, section, layout, posterName], i) => {
  lines.push(`INSERT INTO categories (id, name, section, layout, sort) VALUES (${i + 1}, ${q(name)}, ${q(section)}, ${q(layout)}, ${i});`);
});

const catIndex = new Map(CATEGORIES.map(([name, , , posterName], i) => [posterName ?? name, i + 1]));
const perCat = new Map();
let missing = 0;
for (const it of raw) {
  const cid = catIndex.get(it.categoryName.trim());
  if (!cid) { console.warn('unknown category', it.categoryName); missing++; continue; }
  const sort = perCat.get(cid) ?? 0;
  perCat.set(cid, sort + 1);
  const { name, weight } = clean(it.name);
  lines.push(`INSERT INTO items (category_id, name, price, weight, photo, sort) VALUES (${cid}, ${q(name)}, ${it.price}, ${q(weight)}, ${q(it.photo)}, ${sort});`);
}

const settings = {
  name: 'Dynai',
  tagline: 'Сімейний ресторан у Рені',
  hours: 'Щодня з 10:00 до 23:00',
  instagram: 'https://www.instagram.com/restoran_dynai_reni/',
  logo: 'https://img.postershop.me/68a433984008ce8009f9be6d/3dc41216-8d60-488b-ad41-704c3a8f7bd0-image.jpeg',
};
for (const [k, v] of Object.entries(settings)) lines.push(`INSERT INTO settings (key, value) VALUES (${q(k)}, ${q(v)});`);

mkdirSync(new URL('../seed/', import.meta.url), { recursive: true });
writeFileSync(new URL('../seed/seed.sql', import.meta.url), lines.join('\n') + '\n');
console.log(`seed: ${CATEGORIES.length} categories, ${raw.length - missing} items`);
