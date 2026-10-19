import type { Env } from './db';

export interface TgMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number; first_name?: string; username?: string };
  text?: string;
  caption?: string;
  photo?: { file_id: string; width: number; height: number }[];
  document?: { file_id: string; mime_type?: string };
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: { id: string; from: { id: number }; message?: TgMessage; data?: string };
}

export type Button = { text: string; callback_data: string } | { text: string; url: string };
export type Keyboard = Button[][];

export async function tg<T = any>(env: Env, method: string, body: Record<string, unknown>): Promise<T | null> {
  if (env.TG_DRY === '1') {
    console.log('[tg]', method, JSON.stringify(body));
    return { message_id: Math.floor(Math.random() * 1e6), chat: { id: body.chat_id } } as T;
  }
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    // re-rendering an unchanged view is fine, not an error
    if (data.description?.includes('message is not modified')) return {} as T;
    console.warn('[tg] fail', method, data.description);
    return null;
  }
  return data.result ?? null;
}

export function esc(s: string | null | undefined): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Downloads a file the user sent to the bot. */
export async function downloadFile(env: Env, fileId: string): Promise<ArrayBuffer | null> {
  const f = await tg<{ file_path: string }>(env, 'getFile', { file_id: fileId });
  if (!f?.file_path) return null;
  const res = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${f.file_path}`);
  return res.ok ? res.arrayBuffer() : null;
}
