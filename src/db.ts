export interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
  ADMIN_PASSWORD: string;
  WEBHOOK_SECRET: string;
  /** "1" = log Telegram calls instead of sending them (local tests) */
  TG_DRY?: string;
}

export type Section = 'kitchen' | 'bar';
export type Layout = 'cards' | 'list';

export interface Category {
  id: number;
  name: string;
  section: Section;
  layout: Layout;
  sort: number;
  hidden: number;
}

export interface Item {
  id: number;
  category_id: number;
  name: string;
  price: number;
  weight: string | null;
  description: string | null;
  photo: string | null;
  badge: string | null;
  sort: number;
  hidden: number;
}

export const SETTING_KEYS = ['name', 'tagline', 'hours', 'instagram', 'logo', 'background'] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
export type Settings = Partial<Record<SettingKey, string>>;

export async function categories(db: D1Database): Promise<Category[]> {
  return (await db.prepare('SELECT * FROM categories ORDER BY section = \'bar\', sort, id').all<Category>()).results;
}

export async function category(db: D1Database, id: number): Promise<Category | null> {
  return db.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first<Category>();
}

export async function items(db: D1Database, categoryId?: number): Promise<Item[]> {
  const q = categoryId == null
    ? db.prepare('SELECT * FROM items ORDER BY category_id, sort, id')
    : db.prepare('SELECT * FROM items WHERE category_id = ? ORDER BY sort, id').bind(categoryId);
  return (await q.all<Item>()).results;
}

export async function item(db: D1Database, id: number): Promise<Item | null> {
  return db.prepare('SELECT * FROM items WHERE id = ?').bind(id).first<Item>();
}

export async function settings(db: D1Database): Promise<Settings> {
  const rows = (await db.prepare('SELECT key, value FROM settings').all<{ key: SettingKey; value: string }>()).results;
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function setSetting(db: D1Database, key: SettingKey, value: string | null): Promise<void> {
  await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, value).run();
}

const ITEM_FIELDS = ['name', 'price', 'weight', 'description', 'photo', 'badge', 'hidden', 'category_id', 'sort'] as const;
export type ItemField = (typeof ITEM_FIELDS)[number];

export async function updateItem(db: D1Database, id: number, field: ItemField, value: string | number | null) {
  if (!ITEM_FIELDS.includes(field)) throw new Error(`bad field ${field}`);
  await db.prepare(`UPDATE items SET ${field} = ? WHERE id = ?`).bind(value, id).run();
}

const CATEGORY_FIELDS = ['name', 'section', 'layout', 'hidden', 'sort'] as const;
export type CategoryField = (typeof CATEGORY_FIELDS)[number];

export async function updateCategory(db: D1Database, id: number, field: CategoryField, value: string | number) {
  if (!CATEGORY_FIELDS.includes(field)) throw new Error(`bad field ${field}`);
  await db.prepare(`UPDATE categories SET ${field} = ? WHERE id = ?`).bind(value, id).run();
}

/** Swap an entry with its neighbour in the given direction; rows are renumbered first so gaps or duplicates don't matter. */
export async function move(db: D1Database, table: 'categories' | 'items', id: number, dir: -1 | 1) {
  let rows: { id: number }[];
  if (table === 'items') {
    const it = await item(db, id);
    if (!it) return;
    rows = (await db.prepare('SELECT id FROM items WHERE category_id = ? ORDER BY sort, id').bind(it.category_id).all<{ id: number }>()).results;
  } else {
    const c = await category(db, id);
    if (!c) return;
    rows = (await db.prepare('SELECT id FROM categories WHERE section = ? ORDER BY sort, id').bind(c.section).all<{ id: number }>()).results;
  }
  const ids = rows.map((r) => r.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await db.batch(ids.map((rid, sort) => db.prepare(`UPDATE ${table} SET sort = ? WHERE id = ?`).bind(sort, rid)));
}

export async function nextSort(db: D1Database, table: 'categories' | 'items', where: string, arg: string | number) {
  const r = await db.prepare(`SELECT COALESCE(MAX(sort), -1) + 1 AS s FROM ${table} WHERE ${where} = ?`).bind(arg).first<{ s: number }>();
  return r?.s ?? 0;
}

// D1 caps a single value at 2 MB; Telegram photos are far below that
const MAX_PHOTO_BYTES = 1_900_000;

export async function putPhoto(db: D1Database, data: ArrayBuffer, type: string): Promise<string | null> {
  if (data.byteLength > MAX_PHOTO_BYTES) return null;
  const key = `p/${crypto.randomUUID()}.${type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'}`;
  await db.prepare('INSERT INTO photos (key, type, data) VALUES (?, ?, ?)').bind(key, type, data).run();
  return key;
}

export async function getPhoto(db: D1Database, key: string) {
  const r = await db.prepare('SELECT type, data FROM photos WHERE key = ?').bind(key).first<{ type: string; data: number[] | ArrayBuffer }>();
  if (!r) return null;
  return { type: r.type, data: r.data instanceof ArrayBuffer ? r.data : new Uint8Array(r.data).buffer };
}

/** Removes a stored photo; external URLs are left alone. */
export async function deletePhoto(db: D1Database, photo: string | null) {
  if (photo && !/^https?:/.test(photo)) await db.prepare('DELETE FROM photos WHERE key = ?').bind(photo).run();
}

export function priceText(p: number): string {
  const s = Number.isInteger(p) ? String(p) : p.toFixed(2).replace('.', ',');
  return `${s} ₴`;
}

/** Public URL path for a stored photo; external URLs (not yet imported) are used as is. */
export function photoUrl(photo: string | null): string | null {
  if (!photo) return null;
  return /^https?:\/\//.test(photo) ? photo : `/img/${photo}`;
}
