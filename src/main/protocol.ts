import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { Readable } from 'node:stream';
import { protocol } from 'electron';

// media://source/<projectId> → ملف المصدر الذي تحقق منه main فقط (T024). القراءة فقط، مع دعم Range للـdemuxer.
const sources = new Map<string, string>();

export function registerMediaSource(projectId: string, path: string): void {
  sources.set(projectId, path);
}

const MIME: Record<string, string> = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime' };

// CORS: الواجهة أصلها file:// والوسائط للقراءة فقط؛ ترويسة Range ليست «آمنة» فيسبق الطلب preflight (OPTIONS)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
};

function parseRange(header: string | null, size: number): { start: number; end: number } | 'invalid' | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return 'invalid';
  const [, a, b] = m;
  if (a === '' && b === '') return 'invalid';
  if (a === '') {
    const suffix = Number(b);
    return suffix === 0 ? 'invalid' : { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(a);
  const end = b === '' ? size - 1 : Math.min(Number(b), size - 1);
  return start >= size || start > end ? 'invalid' : { start, end };
}

/** يجب استدعاؤها قبل app.whenReady. corsEnabled: بدونه يرفض Chromium أي fetch عبر الأصل إلى media:// قبل أن يصلنا الطلب. */
export function registerMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'media',
      privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
    },
  ]);
}

/** بعد whenReady. */
export function handleMediaProtocol(): void {
  protocol.handle('media', async (request) => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    const projectId = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const path = url.hostname === 'source' ? sources.get(projectId) : undefined;
    if (!path) return new Response('not found', { status: 404, headers: CORS });
    if (request.method !== 'GET' && request.method !== 'HEAD')
      return new Response('method not allowed', { status: 405, headers: CORS });

    let size: number;
    try {
      size = (await stat(path)).size;
    } catch {
      return new Response('not found', { status: 404, headers: CORS });
    }
    const headers = new Headers({
      ...CORS,
      'Content-Type': MIME[extname(path).toLowerCase()] ?? 'application/octet-stream',
      'Accept-Ranges': 'bytes',
    });
    const range = parseRange(request.headers.get('range'), size);
    if (range === 'invalid') {
      headers.set('Content-Range', `bytes */${size}`);
      return new Response(null, { status: 416, headers });
    }
    const { start, end } = range ?? { start: 0, end: size - 1 };
    headers.set('Content-Length', String(end - start + 1));
    if (range) headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
    const status = range ? 206 : 200;
    if (request.method === 'HEAD') return new Response(null, { status, headers });
    const body = Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream;
    return new Response(body, { status, headers });
  });
}
