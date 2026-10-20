import * as db from './db';
import type { Category, Env, Item, Section, SettingKey } from './db';
import { downloadFile, esc, tg, type Keyboard, type TgMessage, type TgUpdate } from './tg';

type ItemInput = 'name' | 'price' | 'weight' | 'description' | 'photo';

type Session =
  | { await: 'item'; field: ItemInput; id: number }
  | { await: 'cat_new'; section: Section }
  | { await: 'cat_rename'; id: number }
  | { await: 'new_item'; step: 'name' | 'price' | 'weight' | 'photo'; cid: number; name?: string; price?: number; weight?: string | null }
  | { await: 'setting'; key: SettingKey }
  | { await: 'search' }
  | { await: 'login'; fails: number; until?: number };

interface View {
  text: string;
  kb: Keyboard;
  photo?: string | null;
}

interface Ctx {
  env: Env;
  chatId: number;
  origin: string;
}

const PAGE = 12;
const MAX_LOGIN_FAILS = 5;
const LOCK_MS = 60 * 60 * 1000;

const SECTION_NAME: Record<Section, string> = { kitchen: 'Кухня', bar: 'Бар' };
const BADGES: Record<string, string> = { hit: '⭐ Хіт', new: '🆕 Новинка' };

const BTN = { menu: '📋 Меню', add: '➕ Нова страва', search: '🔍 Пошук', settings: '⚙️ Налаштування' };
const MAIN_KB = {
  keyboard: [[{ text: BTN.menu }, { text: BTN.add }], [{ text: BTN.search }, { text: BTN.settings }]],
  resize_keyboard: true,
  is_persistent: true,
};

const SETTING_LABEL: Record<SettingKey, string> = {
  name: 'Назва',
  tagline: 'Підпис під логотипом',
  hours: 'Години роботи',
  instagram: 'Посилання на Instagram',
  logo: 'Логотип',
  background: 'Фон сайту',
};

const cancelKb: Keyboard = [[{ text: '✖ Скасувати', callback_data: 'x' }]];

// ---------- sessions ----------

async function getSession(env: Env, chatId: number): Promise<Session | null> {
  const r = await env.DB.prepare('SELECT data FROM sessions WHERE chat_id = ?').bind(chatId).first<{ data: string }>();
  return r ? (JSON.parse(r.data) as Session) : null;
}

async function setSession(env: Env, chatId: number, s: Session | null) {
  if (s) {
    await env.DB.prepare('INSERT INTO sessions (chat_id, data) VALUES (?, ?) ON CONFLICT(chat_id) DO UPDATE SET data = excluded.data')
      .bind(chatId, JSON.stringify(s)).run();
  } else {
    await env.DB.prepare('DELETE FROM sessions WHERE chat_id = ?').bind(chatId).run();
  }
}

async function isAdmin(env: Env, chatId: number) {
  return !!(await env.DB.prepare('SELECT 1 FROM admins WHERE chat_id = ?').bind(chatId).first());
}

// ---------- output ----------

function absPhoto(ctx: Ctx, photo: string | null) {
  const u = db.photoUrl(photo);
  return u && u.startsWith('/') ? ctx.origin + u : u;
}

async function send(ctx: Ctx, text: string, reply_markup?: unknown) {
  return tg<TgMessage>(ctx.env, 'sendMessage', {
    chat_id: ctx.chatId, text, parse_mode: 'HTML', reply_markup, link_preview_options: { is_disabled: true },
  });
}

/** Renders a view, replacing `prev` in place when Telegram allows it (text→text, photo→photo). */
async function show(ctx: Ctx, view: View, prev?: TgMessage) {
  const reply_markup = { inline_keyboard: view.kb };
  if (prev) {
    const base = { chat_id: ctx.chatId, message_id: prev.message_id, reply_markup };
    if (!prev.photo && !view.photo) {
      const ok = await tg(ctx.env, 'editMessageText', { ...base, text: view.text, parse_mode: 'HTML', link_preview_options: { is_disabled: true } });
      if (ok) return;
    } else if (prev.photo && view.photo) {
      const ok = await tg(ctx.env, 'editMessageMedia', { ...base, media: { type: 'photo', media: view.photo, caption: view.text, parse_mode: 'HTML' } });
      if (ok) return;
    }
    await tg(ctx.env, 'deleteMessage', { chat_id: ctx.chatId, message_id: prev.message_id });
  }
  if (view.photo) {
    const ok = await tg(ctx.env, 'sendPhoto', { chat_id: ctx.chatId, photo: view.photo, caption: view.text, parse_mode: 'HTML', reply_markup });
    if (ok) return;
    // photo URL unreachable for Telegram (e.g. local dev) — fall back to text
  }
  await send(ctx, view.text, reply_markup);
}

// ---------- views ----------

async function homeView(ctx: Ctx): Promise<View> {
  const cats = await db.categories(ctx.env.DB);
  const count = (s: Section) => cats.filter((c) => c.section === s).length;
  return {
    text: '<b>Меню</b>\nОберіть розділ, щоб побачити категорії.',
    kb: [
      [
        { text: `🍽 Кухня (${count('kitchen')})`, callback_data: 'sec:kitchen' },
        { text: `🍸 Бар (${count('bar')})`, callback_data: 'sec:bar' },
      ],
      [{ text: '🌐 Відкрити сайт', url: ctx.origin }],
    ],
  };
}

async function sectionView(ctx: Ctx, section: Section): Promise<View> {
  const cats = (await db.categories(ctx.env.DB)).filter((c) => c.section === section);
  const counts = (await ctx.env.DB.prepare('SELECT category_id, COUNT(*) AS n FROM items GROUP BY category_id').all<{ category_id: number; n: number }>()).results;
  const n = new Map(counts.map((r) => [r.category_id, r.n]));
  const kb: Keyboard = [];
  for (let i = 0; i < cats.length; i += 2) {
    kb.push(cats.slice(i, i + 2).map((c) => ({
      text: `${c.hidden ? '🙈 ' : ''}${c.name} (${n.get(c.id) ?? 0})`,
      callback_data: `cat:${c.id}:0`,
    })));
  }
  kb.push([{ text: '➕ Нова категорія', callback_data: `catnew:${section}` }]);
  kb.push([{ text: '« Назад', callback_data: 'home' }]);
  return {
    text: `<b>${SECTION_NAME[section]}</b>\nКатегорій: ${cats.length}. 🙈 — прихована з сайту.`,
    kb,
  };
}

function itemLabel(it: Item) {
  const flags = `${it.hidden ? '🚫 ' : ''}${it.badge === 'hit' ? '⭐ ' : it.badge === 'new' ? '🆕 ' : ''}`;
  return `${flags}${it.name} — ${db.priceText(it.price)}${it.photo ? '' : ' ▫️'}`;
}

async function categoryView(ctx: Ctx, cid: number, page = 0): Promise<View | null> {
  const c = await db.category(ctx.env.DB, cid);
  if (!c) return null;
  const list = await db.items(ctx.env.DB, cid);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  page = Math.min(Math.max(0, page), pages - 1);
  const kb: Keyboard = list.slice(page * PAGE, page * PAGE + PAGE).map((it) => [{ text: itemLabel(it), callback_data: `item:${it.id}` }]);
  if (pages > 1) {
    kb.push([
      { text: page > 0 ? '◀️' : ' ', callback_data: page > 0 ? `cat:${cid}:${page - 1}` : 'noop' },
      { text: `${page + 1} / ${pages}`, callback_data: 'noop' },
      { text: page < pages - 1 ? '▶️' : ' ', callback_data: page < pages - 1 ? `cat:${cid}:${page + 1}` : 'noop' },
    ]);
  }
  kb.push([{ text: '➕ Додати страву сюди', callback_data: `itemnew:${cid}` }]);
  kb.push([
    { text: '✏️ Перейменувати', callback_data: `catren:${cid}` },
    { text: '⬆️', callback_data: `catmv:${cid}:-1` },
    { text: '⬇️', callback_data: `catmv:${cid}:1` },
  ]);
  kb.push([
    { text: c.section === 'kitchen' ? '🔁 Перенести в Бар' : '🔁 Перенести в Кухню', callback_data: `catsec:${cid}` },
    { text: c.layout === 'cards' ? '🖼 Вигляд: картки' : '📃 Вигляд: список', callback_data: `catlay:${cid}` },
  ]);
  kb.push([
    { text: c.hidden ? '👁 Показати на сайті' : '🙈 Сховати з сайту', callback_data: `cathide:${cid}` },
    { text: '🗑 Видалити', callback_data: `catdel:${cid}` },
  ]);
  kb.push([{ text: `« ${SECTION_NAME[c.section]}`, callback_data: `sec:${c.section}` }]);
  const status = c.hidden ? '\n🙈 Категорія прихована з сайту.' : '';
  const empty = list.length ? '' : '\nПоки порожньо — додайте першу страву.';
  return {
    text: `<b>${esc(c.name)}</b>\n${SECTION_NAME[c.section]}, страв: ${list.length}${status}${empty}\n\n🚫 — у стоп-листі, ▫️ — без фото.`,
    kb,
  };
}

async function itemView(ctx: Ctx, id: number): Promise<View | null> {
  const it = await db.item(ctx.env.DB, id);
  if (!it) return null;
  const c = await db.category(ctx.env.DB, it.category_id);
  const lines = [
    `<b>${esc(it.name)}</b>`,
    `${db.priceText(it.price)}${it.weight ? `  ·  ${esc(it.weight)}` : ''}`,
    it.description ? `\n${esc(it.description.slice(0, 600))}` : '\n<i>Без опису</i>',
    '',
    `📂 ${esc(c?.name ?? '—')}`,
  ];
  if (it.badge) lines.push(BADGES[it.badge] ?? '');
  if (it.hidden) lines.push('🚫 У стоп-листі — гості його не бачать');
  if (!it.photo) lines.push('▫️ Фото немає — натисніть «📷 Фото» і надішліть знімок');
  return {
    text: lines.join('\n'),
    photo: absPhoto(ctx, it.photo),
    kb: [
      [{ text: '💰 Ціна', callback_data: `if:price:${id}` }, { text: '✏️ Назва', callback_data: `if:name:${id}` }],
      [{ text: '⚖️ Вага / об’єм', callback_data: `if:weight:${id}` }, { text: '📝 Опис', callback_data: `if:description:${id}` }],
      [{ text: it.photo ? '📷 Змінити фото' : '📷 Додати фото', callback_data: `if:photo:${id}` }],
      [
        { text: it.badge === 'hit' ? '⭐ Хіт ✓' : '⭐ Хіт', callback_data: `ibadge:hit:${id}` },
        { text: it.badge === 'new' ? '🆕 Новинка ✓' : '🆕 Новинка', callback_data: `ibadge:new:${id}` },
      ],
      [{ text: it.hidden ? '✅ Повернути в меню' : '🚫 Стоп-лист (сховати)', callback_data: `ihide:${id}` }],
      [
        { text: '⬆️', callback_data: `imv:${id}:-1` },
        { text: '⬇️', callback_data: `imv:${id}:1` },
        { text: '📂 Інша категорія', callback_data: `imove:${id}` },
      ],
      [{ text: '🗑 Видалити страву', callback_data: `idel:${id}` }],
      [{ text: `« ${c?.name ?? 'Назад'}`, callback_data: `cat:${it.category_id}:${Math.floor(await indexIn(ctx, it) / PAGE)}` }],
    ],
  };
}

async function indexIn(ctx: Ctx, it: Item) {
  const list = await db.items(ctx.env.DB, it.category_id);
  return Math.max(0, list.findIndex((x) => x.id === it.id));
}

async function moveTargetsView(ctx: Ctx, id: number): Promise<View> {
  const it = await db.item(ctx.env.DB, id);
  const cats = (await db.categories(ctx.env.DB)).filter((c) => c.id !== it?.category_id);
  const kb: Keyboard = [];
  for (let i = 0; i < cats.length; i += 2) {
    kb.push(cats.slice(i, i + 2).map((c) => ({ text: c.name, callback_data: `imoveto:${id}:${c.id}` })));
  }
  kb.push([{ text: '« Назад', callback_data: `item:${id}` }]);
  return { text: `Куди перенести <b>${esc(it?.name)}</b>?`, kb };
}

async function pickCategoryView(ctx: Ctx): Promise<View> {
  const cats = await db.categories(ctx.env.DB);
  const kb: Keyboard = [];
  for (let i = 0; i < cats.length; i += 2) {
    kb.push(cats.slice(i, i + 2).map((c) => ({ text: c.name, callback_data: `itemnew:${c.id}` })));
  }
  kb.push(cancelKb[0]);
  return { text: 'У яку категорію додати страву?', kb };
}

async function settingsView(ctx: Ctx): Promise<View> {
  const s = await db.settings(ctx.env.DB);
  const admins = (await ctx.env.DB.prepare('SELECT COUNT(*) AS n FROM admins').first<{ n: number }>())?.n ?? 0;
  return {
    text: [
      '<b>Налаштування сайту</b>',
      '',
      `<b>Назва:</b> ${esc(s.name)}`,
      `<b>Підпис:</b> ${esc(s.tagline)}`,
      `<b>Години:</b> ${esc(s.hours)}`,
      `<b>Instagram:</b> ${esc(s.instagram)}`,
      `<b>Логотип:</b> ${s.logo ? 'є' : 'немає'}`,
      '',
      `Доступ до бота мають: ${admins}`,
    ].join('\n'),
    kb: [
      [{ text: '✏️ Назва', callback_data: 'set:name' }, { text: '✏️ Підпис', callback_data: 'set:tagline' }],
      [{ text: '🕙 Години', callback_data: 'set:hours' }, { text: '📸 Instagram', callback_data: 'set:instagram' }],
      [{ text: '🖼 Логотип', callback_data: 'set:logo' }],
      [{ text: '👥 Хто має доступ', callback_data: 'admins' }],
      [{ text: '🌐 Відкрити сайт', url: ctx.origin }],
    ],
  };
}

async function adminsView(ctx: Ctx): Promise<View> {
  const rows = (await ctx.env.DB.prepare('SELECT chat_id, name, added FROM admins ORDER BY added').all<{ chat_id: number; name: string | null; added: string }>()).results;
  const kb: Keyboard = rows.map((r) => [{
    text: `🗑 ${r.name ?? r.chat_id}${r.chat_id === ctx.chatId ? ' (ви)' : ''}`,
    callback_data: `adel:${r.chat_id}`,
  }]);
  kb.push([{ text: '« Налаштування', callback_data: 'settings' }]);
  return {
    text: '<b>Хто має доступ</b>\nНовий адміністратор просто надсилає боту пароль. Натисніть на людину, щоб забрати доступ.',
    kb,
  };
}

function confirmView(text: string, yes: string, no: string): View {
  return { text, kb: [[{ text: '🗑 Так, видалити', callback_data: yes }, { text: 'Ні', callback_data: no }]] };
}

// ---------- prompts ----------

const ITEM_PROMPT: Record<ItemInput, string> = {
  price: 'Надішліть нову ціну числом, наприклад <code>280</code>.',
  name: 'Надішліть нову назву.',
  weight: 'Надішліть вагу або об’єм, наприклад <code>300 г</code> чи <code>0,5 л</code>. Щоб прибрати — надішліть <code>-</code>.',
  description: 'Надішліть опис (склад, як подається). Щоб прибрати — надішліть <code>-</code>.',
  photo: 'Надішліть фото страви. Щоб прибрати фото — надішліть <code>-</code>.',
};

function parsePrice(s: string): number | null {
  const t = s.replace(/[\s₴]|грн\.?/gi, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Number(t);
}

function clearable(s: string): string | null {
  const t = s.trim();
  return t === '-' || t === '—' ? null : t;
}

// ---------- photos ----------

async function savePhoto(ctx: Ctx, msg: TgMessage): Promise<string | null> {
  let fileId: string | undefined;
  let type = 'image/jpeg';
  if (msg.photo?.length) fileId = msg.photo[msg.photo.length - 1].file_id;
  else if (msg.document?.mime_type?.startsWith('image/')) {
    fileId = msg.document.file_id;
    type = msg.document.mime_type;
  }
  if (!fileId) return null;
  const buf = await downloadFile(ctx.env, fileId);
  if (!buf) return null;
  return db.putPhoto(ctx.env.DB, buf, type);
}

async function dropPhoto(env: Env, photo: string | null) {
  await db.deletePhoto(env.DB, photo);
}

// ---------- callbacks ----------

async function onCallback(ctx: Ctx, data: string, msg?: TgMessage): Promise<string | void> {
  const [cmd, a, b] = data.split(':');
  const { env } = ctx;
  const id = Number(a);

  switch (cmd) {
    case 'noop':
      return;
    case 'x':
      await setSession(env, ctx.chatId, null);
      if (msg) await tg(env, 'deleteMessage', { chat_id: ctx.chatId, message_id: msg.message_id });
      return 'Скасовано';
    case 'home':
      return show(ctx, await homeView(ctx), msg);
    case 'sec':
      return show(ctx, await sectionView(ctx, a as Section), msg);
    case 'cat': {
      const v = await categoryView(ctx, id, Number(b) || 0);
      if (!v) return 'Категорію вже видалено';
      return show(ctx, v, msg);
    }
    case 'catnew':
      await setSession(env, ctx.chatId, { await: 'cat_new', section: a as Section });
      await send(ctx, `Як назвати нову категорію в розділі «${SECTION_NAME[a as Section]}»?`, { inline_keyboard: cancelKb });
      return;
    case 'catren':
      await setSession(env, ctx.chatId, { await: 'cat_rename', id });
      await send(ctx, 'Надішліть нову назву категорії.', { inline_keyboard: cancelKb });
      return;
    case 'catmv':
      await db.move(env.DB, 'categories', id, Number(b) as -1 | 1);
      return show(ctx, (await categoryView(ctx, id))!, msg).then(() => 'Порядок змінено');
    case 'catsec': {
      const c = await db.category(env.DB, id);
      if (!c) return;
      const to: Section = c.section === 'kitchen' ? 'bar' : 'kitchen';
      await db.updateCategory(env.DB, id, 'section', to);
      await db.updateCategory(env.DB, id, 'sort', await db.nextSort(env.DB, 'categories', 'section', to));
      await show(ctx, (await categoryView(ctx, id))!, msg);
      return `Перенесено в «${SECTION_NAME[to]}»`;
    }
    case 'catlay': {
      const c = await db.category(env.DB, id);
      if (!c) return;
      await db.updateCategory(env.DB, id, 'layout', c.layout === 'cards' ? 'list' : 'cards');
      await show(ctx, (await categoryView(ctx, id))!, msg);
      return c.layout === 'cards' ? 'Тепер списком' : 'Тепер картками з фото';
    }
    case 'cathide': {
      const c = await db.category(env.DB, id);
      if (!c) return;
      await db.updateCategory(env.DB, id, 'hidden', c.hidden ? 0 : 1);
      await show(ctx, (await categoryView(ctx, id))!, msg);
      return c.hidden ? 'Категорія знову на сайті' : 'Категорію сховано';
    }
    case 'catdel': {
      const c = await db.category(env.DB, id);
      if (!c) return;
      const n = (await db.items(env.DB, id)).length;
      return show(ctx, confirmView(
        `Видалити категорію <b>${esc(c.name)}</b>${n ? ` разом з усіма стравами (${n})` : ''}? Це не можна скасувати.`,
        `catdelok:${id}`, `cat:${id}:0`,
      ), msg);
    }
    case 'catdelok': {
      const c = await db.category(env.DB, id);
      if (!c) return;
      for (const it of await db.items(env.DB, id)) await dropPhoto(env, it.photo);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM items WHERE category_id = ?').bind(id),
        env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id),
      ]);
      await show(ctx, await sectionView(ctx, c.section), msg);
      return 'Категорію видалено';
    }
    case 'item': {
      const v = await itemView(ctx, id);
      if (!v) return 'Страву вже видалено';
      return show(ctx, v, msg);
    }
    case 'itemnew':
      if (!a) return show(ctx, await pickCategoryView(ctx), msg);
      await setSession(env, ctx.chatId, { await: 'new_item', step: 'name', cid: id });
      await send(ctx, `Нова страва в «${esc((await db.category(env.DB, id))?.name)}».\n\nЯк вона називається?`, { inline_keyboard: cancelKb });
      return;
    case 'if':
      await setSession(env, ctx.chatId, { await: 'item', field: a as ItemInput, id: Number(b) });
      await send(ctx, ITEM_PROMPT[a as ItemInput], { inline_keyboard: cancelKb });
      return;
    case 'ibadge': {
      const it = await db.item(env.DB, Number(b));
      if (!it) return;
      const badge = it.badge === a ? null : a;
      await db.updateItem(env.DB, it.id, 'badge', badge);
      await show(ctx, (await itemView(ctx, it.id))!, msg);
      return badge ? `Позначено: ${BADGES[badge]}` : 'Позначку знято';
    }
    case 'ihide': {
      const it = await db.item(env.DB, id);
      if (!it) return;
      await db.updateItem(env.DB, id, 'hidden', it.hidden ? 0 : 1);
      await show(ctx, (await itemView(ctx, id))!, msg);
      return it.hidden ? 'Повернуто в меню' : 'Сховано (стоп-лист)';
    }
    case 'imv':
      await db.move(env.DB, 'items', id, Number(b) as -1 | 1);
      await show(ctx, (await itemView(ctx, id))!, msg);
      return 'Порядок змінено';
    case 'imove':
      return show(ctx, await moveTargetsView(ctx, id), msg);
    case 'imoveto': {
      const cid = Number(b);
      await db.updateItem(env.DB, id, 'category_id', cid);
      await db.updateItem(env.DB, id, 'sort', (await db.nextSort(env.DB, 'items', 'category_id', cid)));
      await show(ctx, (await itemView(ctx, id))!, msg);
      return 'Перенесено';
    }
    case 'idel': {
      const it = await db.item(env.DB, id);
      if (!it) return;
      return show(ctx, confirmView(`Видалити <b>${esc(it.name)}</b> з меню назавжди?\nЯкщо страва тимчасово закінчилась — краще «🚫 Стоп-лист».`, `idelok:${id}`, `item:${id}`), msg);
    }
    case 'idelok': {
      const it = await db.item(env.DB, id);
      if (!it) return;
      await dropPhoto(env, it.photo);
      await env.DB.prepare('DELETE FROM items WHERE id = ?').bind(id).run();
      await show(ctx, (await categoryView(ctx, it.category_id))!, msg);
      return 'Страву видалено';
    }
    case 'settings':
      return show(ctx, await settingsView(ctx), msg);
    case 'set': {
      const key = a as SettingKey;
      await setSession(env, ctx.chatId, { await: 'setting', key });
      const hint = key === 'logo' ? 'Надішліть зображення логотипу.' : `Надішліть нове значення: ${SETTING_LABEL[key].toLowerCase()}.`;
      await send(ctx, hint, { inline_keyboard: cancelKb });
      return;
    }
    case 'admins':
      return show(ctx, await adminsView(ctx), msg);
    case 'adel':
      await env.DB.prepare('DELETE FROM admins WHERE chat_id = ?').bind(id).run();
      if (id === ctx.chatId) {
        if (msg) await tg(env, 'deleteMessage', { chat_id: ctx.chatId, message_id: msg.message_id });
        await send(ctx, 'Ви вийшли. Щоб повернутись, надішліть пароль.', { remove_keyboard: true });
        return;
      }
      await show(ctx, await adminsView(ctx), msg);
      return 'Доступ забрано';
  }
}

// ---------- text / photo input ----------

async function onInput(ctx: Ctx, msg: TgMessage, s: Session): Promise<void> {
  const { env } = ctx;
  const text = msg.text?.trim() ?? '';

  switch (s.await) {
    case 'item': {
      const it = await db.item(env.DB, s.id);
      if (!it) { await setSession(env, ctx.chatId, null); await send(ctx, 'Цю страву вже видалено.'); return; }
      if (s.field === 'photo') {
        if (text && clearable(text) === null) {
          await dropPhoto(env, it.photo);
          await db.updateItem(env.DB, it.id, 'photo', null);
        } else {
          const key = await savePhoto(ctx, msg);
          if (!key) { await send(ctx, 'Це не схоже на фото. Надішліть знімок або <code>-</code>, щоб прибрати фото.', { inline_keyboard: cancelKb }); return; }
          await dropPhoto(env, it.photo);
          await db.updateItem(env.DB, it.id, 'photo', key);
        }
      } else if (s.field === 'price') {
        const p = parsePrice(text);
        if (p == null) { await send(ctx, 'Не розумію ціну. Надішліть лише число, наприклад <code>280</code>.', { inline_keyboard: cancelKb }); return; }
        await db.updateItem(env.DB, it.id, 'price', p);
      } else if (s.field === 'name') {
        if (!text) { await send(ctx, 'Назва не може бути порожньою.', { inline_keyboard: cancelKb }); return; }
        await db.updateItem(env.DB, it.id, 'name', text);
      } else {
        if (!text) { await send(ctx, 'Надішліть текст або <code>-</code>.', { inline_keyboard: cancelKb }); return; }
        await db.updateItem(env.DB, it.id, s.field, clearable(text));
      }
      await setSession(env, ctx.chatId, null);
      await send(ctx, '✅ Збережено, на сайті вже оновилось.');
      await show(ctx, (await itemView(ctx, it.id))!);
      return;
    }

    case 'cat_new': {
      if (!text) { await send(ctx, 'Надішліть назву текстом.', { inline_keyboard: cancelKb }); return; }
      const sort = await db.nextSort(env.DB, 'categories', 'section', s.section);
      const layout = s.section === 'bar' ? 'list' : 'cards';
      const r = await env.DB.prepare('INSERT INTO categories (name, section, layout, sort) VALUES (?, ?, ?, ?) RETURNING id')
        .bind(text, s.section, layout, sort).first<{ id: number }>();
      await setSession(env, ctx.chatId, null);
      await send(ctx, `✅ Категорію «${esc(text)}» створено.`);
      await show(ctx, (await categoryView(ctx, r!.id))!);
      return;
    }

    case 'cat_rename': {
      if (!text) { await send(ctx, 'Надішліть назву текстом.', { inline_keyboard: cancelKb }); return; }
      await db.updateCategory(env.DB, s.id, 'name', text);
      await setSession(env, ctx.chatId, null);
      await send(ctx, '✅ Перейменовано.');
      const v = await categoryView(ctx, s.id);
      if (v) await show(ctx, v);
      return;
    }

    case 'new_item': {
      if (s.step === 'name') {
        if (!text) { await send(ctx, 'Надішліть назву текстом.', { inline_keyboard: cancelKb }); return; }
        await setSession(env, ctx.chatId, { ...s, step: 'price', name: text });
        await send(ctx, 'Скільки коштує? Надішліть число, наприклад <code>280</code>.', { inline_keyboard: cancelKb });
        return;
      }
      if (s.step === 'price') {
        const p = parsePrice(text);
        if (p == null) { await send(ctx, 'Не розумію ціну. Надішліть лише число, наприклад <code>280</code>.', { inline_keyboard: cancelKb }); return; }
        await setSession(env, ctx.chatId, { ...s, step: 'weight', price: p });
        await send(ctx, 'Вага або об’єм? Наприклад <code>300 г</code>. Якщо не треба — надішліть <code>-</code>.', { inline_keyboard: cancelKb });
        return;
      }
      if (s.step === 'weight') {
        if (!text) { await send(ctx, 'Надішліть вагу або <code>-</code>.', { inline_keyboard: cancelKb }); return; }
        await setSession(env, ctx.chatId, { ...s, step: 'photo', weight: clearable(text) });
        await send(ctx, 'Надішліть фото страви. Без фото — надішліть <code>-</code>, додасте пізніше.', { inline_keyboard: cancelKb });
        return;
      }
      // step: photo
      let photo: string | null = null;
      if (!(text && clearable(text) === null)) {
        photo = await savePhoto(ctx, msg);
        if (!photo) { await send(ctx, 'Це не схоже на фото. Надішліть знімок або <code>-</code>.', { inline_keyboard: cancelKb }); return; }
      }
      const sort = await db.nextSort(env.DB, 'items', 'category_id', s.cid);
      const r = await env.DB.prepare('INSERT INTO items (category_id, name, price, weight, photo, sort) VALUES (?, ?, ?, ?, ?, ?) RETURNING id')
        .bind(s.cid, s.name, s.price, s.weight ?? null, photo, sort).first<{ id: number }>();
      await setSession(env, ctx.chatId, null);
      await send(ctx, '✅ Страву додано в меню. Опис можна додати кнопкою «📝 Опис».');
      await show(ctx, (await itemView(ctx, r!.id))!);
      return;
    }

    case 'setting': {
      let value: string | null;
      if (s.key === 'logo') {
        value = await savePhoto(ctx, msg);
        if (!value) { await send(ctx, 'Надішліть зображення логотипу.', { inline_keyboard: cancelKb }); return; }
        await dropPhoto(env, (await db.settings(env.DB)).logo ?? null);
      } else {
        if (!text) { await send(ctx, 'Надішліть текст.', { inline_keyboard: cancelKb }); return; }
        value = text;
        if (s.key === 'instagram' && !/^https?:\/\//.test(value)) {
          value = `https://www.instagram.com/${value.replace(/^@/, '')}/`;
        }
      }
      await db.setSetting(env.DB, s.key, value);
      await setSession(env, ctx.chatId, null);
      await send(ctx, '✅ Збережено.');
      await show(ctx, await settingsView(ctx));
      return;
    }

    case 'search':
      await setSession(env, ctx.chatId, null);
      return search(ctx, text);

    case 'login':
      return; // handled before auth
  }
}

async function search(ctx: Ctx, q: string) {
  const needle = q.toLowerCase().trim();
  if (!needle) return;
  const found = (await db.items(ctx.env.DB)).filter((it) => it.name.toLowerCase().includes(needle));
  if (found.length === 1) return show(ctx, (await itemView(ctx, found[0].id))!);
  if (!found.length) {
    await send(ctx, `Нічого не знайшов за «${esc(q)}». Спробуйте частину назви, наприклад <code>борщ</code>.`);
    return;
  }
  const kb: Keyboard = found.slice(0, 30).map((it) => [{ text: itemLabel(it), callback_data: `item:${it.id}` }]);
  await show(ctx, { text: `Знайдено: ${found.length}${found.length > 30 ? ' (показую перші 30)' : ''}`, kb });
}

// ---------- entry ----------

async function login(ctx: Ctx, msg: TgMessage) {
  const { env } = ctx;
  const s = await getSession(env, ctx.chatId);
  const state = s?.await === 'login' ? s : { await: 'login' as const, fails: 0 };
  if (state.until && Date.now() < state.until) {
    await send(ctx, 'Забагато невдалих спроб. Спробуйте пізніше.');
    return;
  }
  if (msg.text?.trim() === env.ADMIN_PASSWORD) {
    const name = [msg.from?.first_name, msg.from?.username && `@${msg.from.username}`].filter(Boolean).join(' ') || null;
    await env.DB.prepare('INSERT OR REPLACE INTO admins (chat_id, name) VALUES (?, ?)').bind(ctx.chatId, name).run();
    await setSession(env, ctx.chatId, null);
    await send(ctx, 'Вітаю! Тепер ви можете керувати меню.\n\n📋 <b>Меню</b> — категорії та страви\n➕ <b>Нова страва</b> — додати позицію\n🔍 <b>Пошук</b> — знайти страву за назвою\n⚙️ <b>Налаштування</b> — назва, години, Instagram, логотип\n\nМожна також просто написати назву страви — бот її знайде.', MAIN_KB);
    return;
  }
  if (msg.text && msg.text !== '/start') {
    const fails = state.fails + 1;
    const locked = fails >= MAX_LOGIN_FAILS;
    await setSession(env, ctx.chatId, { await: 'login', fails: locked ? 0 : fails, until: locked ? Date.now() + LOCK_MS : undefined });
    await send(ctx, locked ? 'Забагато невдалих спроб. Спробуйте через годину.' : 'Пароль неправильний.');
    return;
  }
  await send(ctx, 'Це бот для керування меню ресторану Dynai.\nНадішліть пароль доступу.');
}

export async function handleUpdate(env: Env, update: TgUpdate, origin: string) {
  const cb = update.callback_query;
  const msg = update.message;
  const chatId = cb?.message?.chat.id ?? cb?.from.id ?? msg?.chat.id;
  if (!chatId) return;
  const ctx: Ctx = { env, chatId, origin };

  if (!(await isAdmin(env, chatId))) {
    if (cb) await tg(env, 'answerCallbackQuery', { callback_query_id: cb.id, text: 'Немає доступу. Надішліть боту пароль.' });
    else if (msg) await login(ctx, msg);
    return;
  }

  if (cb) {
    let toast: string | void = undefined;
    try {
      toast = await onCallback(ctx, cb.data ?? '', cb.message);
    } finally {
      await tg(env, 'answerCallbackQuery', { callback_query_id: cb.id, text: toast || undefined });
    }
    return;
  }
  if (!msg) return;

  const text = msg.text?.trim() ?? '';
  // main buttons and commands always win over an unfinished input
  if (text === '/start' || text === BTN.menu || text === '/menu') {
    await setSession(env, chatId, null);
    if (text === '/start') await send(ctx, 'Головне меню 👇', MAIN_KB);
    return show(ctx, await homeView(ctx));
  }
  if (text === '/cancel') {
    await setSession(env, chatId, null);
    await send(ctx, 'Скасовано.', MAIN_KB);
    return;
  }
  if (text === BTN.add) {
    await setSession(env, chatId, null);
    return show(ctx, await pickCategoryView(ctx));
  }
  if (text === BTN.search) {
    await setSession(env, chatId, { await: 'search' });
    await send(ctx, 'Напишіть назву або її частину.', { inline_keyboard: cancelKb });
    return;
  }
  if (text === BTN.settings) {
    await setSession(env, chatId, null);
    return show(ctx, await settingsView(ctx));
  }

  const s = await getSession(env, chatId);
  if (s && s.await !== 'login') return onInput(ctx, msg, s);
  if (text) return search(ctx, text);
  if (msg.photo) await send(ctx, 'Щоб поставити фото, відкрийте страву і натисніть «📷 Фото».');
}
