import * as db from './db';
import type { Env } from './db';
import { handleUpdate } from './bot';
import { renderMenu } from './page';
import { tg, type TgUpdate } from './tg';

// one call fetches at most this many photos (free plan allows 50 outgoing requests per call)
const IMPORT_BATCH = 40;

const BOT_COMMANDS = [
  { command: 'menu', description: 'Категорії та страви' },
  { command: 'cancel', description: 'Скасувати введення' },
];

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    if (req.method === 'GET' && path === '/') {
      const [s, cats, all] = await Promise.all([db.settings(env.DB), db.categories(env.DB), db.items(env.DB)]);
      return new Response(renderMenu(s, cats, all), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' },
      });
    }

    if (req.method === 'GET' && path.startsWith('/img/')) {
      const photo = await db.getPhoto(env.DB, decodeURIComponent(path.slice(5)));
      if (!photo) return new Response('Not found', { status: 404 });
      return new Response(photo.data, {
        headers: {
          'content-type': photo.type,
          // keys are unique per upload, so the file never changes
          'cache-control': 'public, max-age=31536000, immutable',
        },
      });
    }

    if (req.method === 'POST' && path === `/tg/${env.WEBHOOK_SECRET}`) {
      if (env.TG_DRY !== '1' && req.headers.get('x-telegram-bot-api-secret-token') !== env.WEBHOOK_SECRET) {
        return new Response('Forbidden', { status: 403 });
      }
      const update = (await req.json()) as TgUpdate;
      // answer Telegram at once; the work continues in the background
      ctx.waitUntil(handleUpdate(env, update, url.origin).catch((e) => console.error('bot error', e)));
      return new Response('ok');
    }

    if (path.startsWith('/admin/')) {
      if (req.headers.get('x-secret') !== env.WEBHOOK_SECRET && url.searchParams.get('secret') !== env.WEBHOOK_SECRET) {
        return new Response('Forbidden', { status: 403 });
      }
      if (path === '/admin/webhook') {
        const res = await tg(env, 'setWebhook', {
          url: `${url.origin}/tg/${env.WEBHOOK_SECRET}`,
          secret_token: env.WEBHOOK_SECRET,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: true,
        });
        await tg(env, 'setMyCommands', { commands: BOT_COMMANDS });
        return Response.json({ webhook: res, url: `${url.origin}/tg/…` });
      }
      if (path === '/admin/import-photos') return Response.json(await importPhotos(env));
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/** Copies photos still hosted on Poster's CDN into R2, a batch per call. */
async function importPhotos(env: Env) {
  const pending = (await env.DB.prepare("SELECT id, photo FROM items WHERE photo LIKE 'http%' LIMIT ?").bind(IMPORT_BATCH).all<{ id: number; photo: string }>()).results;
  const s = await db.settings(env.DB);
  const failed: number[] = [];
  let done = 0;

  async function copy(src: string): Promise<string | null> {
    const res = await fetch(src, { headers: { 'user-agent': 'Mozilla/5.0 (dunai-menu photo import)' } });
    if (!res.ok) {
      console.warn('import failed', res.status, src);
      return null;
    }
    return db.putPhoto(env.DB, await res.arrayBuffer(), res.headers.get('content-type') ?? 'image/jpeg');
  }

  if (s.logo?.startsWith('http')) {
    const key = await copy(s.logo);
    if (key) await db.setSetting(env.DB, 'logo', key);
  }
  for (const it of pending) {
    const key = await copy(it.photo).catch(() => null);
    if (key) {
      await db.updateItem(env.DB, it.id, 'photo', key);
      done++;
    } else {
      failed.push(it.id);
    }
  }
  const left = (await env.DB.prepare("SELECT COUNT(*) AS n FROM items WHERE photo LIKE 'http%'").first<{ n: number }>())?.n ?? 0;
  return { done, failed, left };
}
