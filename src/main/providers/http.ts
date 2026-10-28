import { readFile } from 'node:fs/promises';

// طبقة HTTP واحدة لكل المزودين (T044، FR-017): fetch من main، مهلة، إعادة محاولة 3 مرات،
// أخطاء مصنّفة برموز ثابتة ورسائل عربية. لا سجلات هنا أبداً: الترويسات تحمل المفتاح.

export type ProviderErrorCode = 'offline' | 'timeout' | 'no_api_key' | 'quota' | 'provider_error' | 'aborted';

const MESSAGES: Record<ProviderErrorCode, string> = {
  offline: 'لا يوجد اتصال بالإنترنت أو لا يمكن الوصول إلى المزود',
  timeout: 'انتهت مهلة الطلب إلى المزود',
  no_api_key: 'المزود رفض المفتاح (غير صالح أو منتهٍ)',
  quota: 'الرصيد أو حد الاستخدام عند المزود غير كافٍ',
  provider_error: 'خطأ من المزود',
  aborted: 'أُلغي الطلب',
};

export class ProviderError extends Error {
  code: ProviderErrorCode;
  status?: number;
  constructor(code: ProviderErrorCode, status?: number) {
    super(status === undefined ? MESSAGES[code] : `${MESSAGES[code]} (HTTP ${status})`);
    this.name = 'ProviderError';
    this.code = code;
    if (status !== undefined) this.status = status;
  }
}

export interface SendOptions {
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
  /** سقف جسم الاستجابة بالبايت (الافتراضي 64 MB) */
  maxBodyBytes?: number;
}

const MAX_BODY_BYTES = 64 * 1024 * 1024;

export interface HttpResult {
  status: number;
  json: unknown;
}

export interface MultipartRequest {
  headers: Record<string, string>;
  fields: Record<string, string>;
  file: { path: string; filename: string; contentType: string };
}

export interface BodyRequest {
  headers: Record<string, string>;
  body: Uint8Array;
  contentType: string;
}

const BACKOFF_MS = [1000, 3000, 9000];

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ProviderError('aborted'));
    const t = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort(): void {
      clearTimeout(t);
      reject(new ProviderError('aborted'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** يقرأ الجسم تدفقياً بسقف: content-length أولاً ثم العدّ أثناء القراءة (مراجعة US1 #4) — استجابة ضخمة لا تبتلع الذاكرة */
async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const declared = Number(res.headers.get('content-length'));
  if (declared > maxBytes) throw new ProviderError('provider_error', res.status);
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new ProviderError('provider_error', res.status);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function once(url: string, headers: Record<string, string>, body: BodyInit, timeoutMs: number, maxBodyBytes: number, userSignal?: AbortSignal): Promise<HttpResult> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = userSignal ? AbortSignal.any([timeoutSignal, userSignal]) : timeoutSignal;
  // لا نصنّف حسب اسم الخطأ (يتغير بين إصدارات undici) بل حسب أيّ إشارة أُلغيت
  const classifyNetwork = (): ProviderError => {
    if (userSignal?.aborted) return new ProviderError('aborted');
    if (timeoutSignal.aborted) return new ProviderError('timeout');
    return new ProviderError('offline');
  };

  let res: Response;
  let text: string;
  try {
    // لا تتبّع لإعادة التوجيه: الترويسة تحمل المفتاح ولا تغادر مضيف المزود. 'manual' لا 'error' لأن undici يرمي
    // عند 'error' نفس TypeError التي يرميها انقطاع الشبكة فتُصنَّف offline؛ مع 'manual' تصل 3xx كحالة → provider_error
    res = await fetch(url, { method: 'POST', headers, body, signal, redirect: 'manual' });
    text = await readCapped(res, maxBodyBytes);
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    throw classifyNetwork();
  }

  const { status } = res;
  if (status === 401 || status === 403) throw new ProviderError('no_api_key', status);
  if (status === 402 || status === 429) throw new ProviderError('quota', status);
  if (status < 200 || status >= 300) throw new ProviderError('provider_error', status);
  try {
    return { status, json: JSON.parse(text) as unknown };
  } catch {
    throw new ProviderError('provider_error', status);
  }
}

function retryable(e: ProviderError): boolean {
  return e.code === 'offline' || e.code === 'timeout' || (e.code === 'provider_error' && (e.status ?? 0) >= 500);
}

async function send(url: string, headers: Record<string, string>, body: BodyInit, opts: SendOptions): Promise<HttpResult> {
  const retries = opts.retries ?? 3;
  const timeoutMs = opts.timeoutMs ?? 300_000;
  const maxBodyBytes = opts.maxBodyBytes ?? MAX_BODY_BYTES;
  for (let attempt = 0; ; attempt++) {
    try {
      return await once(url, headers, body, timeoutMs, maxBodyBytes, opts.signal);
    } catch (e) {
      if (!(e instanceof ProviderError) || !retryable(e) || attempt >= retries) throw e;
      await sleep(BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)] as number, opts.signal);
    }
  }
}

export async function postMultipart(url: string, req: MultipartRequest, opts: SendOptions = {}): Promise<HttpResult> {
  const bytes = await readFile(req.file.path); // الصوت صغير (≈3.6 MB لـ15 دقيقة)
  const form = new FormData();
  for (const [k, v] of Object.entries(req.fields)) form.append(k, v);
  form.append('file', new Blob([bytes], { type: req.file.contentType }), req.file.filename);
  return send(url, req.headers, form, opts);
}

export async function postBody(url: string, req: BodyRequest, opts: SendOptions = {}): Promise<HttpResult> {
  const headers = { ...req.headers, 'content-type': req.contentType };
  return send(url, headers, new Blob([req.body as BlobPart], { type: req.contentType }), opts);
}
