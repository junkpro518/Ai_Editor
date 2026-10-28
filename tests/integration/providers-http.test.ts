import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveFfmpeg } from '../../src/main/ffmpeg/paths';
import { ProviderError, postBody, postMultipart } from '../../src/main/providers/http';
import { transcribeDeepgram } from '../../src/main/providers/deepgram';
import { transcribeElevenLabs } from '../../src/main/providers/elevenlabs';
import { runTranscriptionJob } from '../../src/main/transcription/job';
import type { JobState } from '../../src/main/transcription/job';
import { registerTranscriptionIpc } from '../../src/main/transcription/ipc';
import type { IpcEventLike, IpcMainLike, TranscriptEvent } from '../../src/main/transcription/ipc';
import type { Envelope } from '../../src/main/ipc';
import type { Secrets } from '../../src/main/secrets';
import { createSettingsStore } from '../../src/main/storage/settings';
import { createProjectStore } from '../../src/main/storage/projects';
import { validateTranscript } from '../../src/core/contracts';
import { makeProject } from '../helpers/project';
import deepgramArSa from '../fixtures/providers/deepgram-ar-sa.json';
import elevenlabsScribe from '../fixtures/providers/elevenlabs-scribe-v2.json';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const fx = (name: string): string => join(repo, 'tests/fixtures', name);
const tmp = join(repo, 'out/test-tmp/providers');
const bins = resolveFfmpeg();

// مفتاح وهمي للاختبار فقط — لا يوجد مفتاح حقيقي على هذا الجهاز ولا يُستدعى أي مزود خارجي
const DUMMY_KEY = 'dummy-test-key-0123456789abcdef';

interface Seen {
  method: string;
  url: string;
  headers: IncomingMessage['headers'];
  body: Buffer;
}
type Handler = (req: Seen, res: ServerResponse) => void | Promise<void>;

let server: Server;
let baseUrl: string;
let handler: Handler = (_req, res) => {
  res.end();
};
const seen: Seen[] = [];

function reply(res: ServerResponse, status: number, json: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(json));
}

async function parseMultipart(req: Seen): Promise<FormData> {
  return new Response(new Uint8Array(req.body), { headers: { 'content-type': String(req.headers['content-type']) } }).formData();
}

beforeAll(async () => {
  mkdirSync(tmp, { recursive: true });
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      const s: Seen = { method: req.method ?? '', url: req.url ?? '', headers: req.headers, body: Buffer.concat(chunks) };
      seen.push(s);
      void handler(s, res);
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(() => {
  seen.length = 0;
  handler = (_req, res) => {
    res.end();
  };
});

afterAll(async () => {
  await new Promise<void>((r) => server.close(() => r()));
  rmSync(tmp, { recursive: true, force: true });
});

describe('http.ts: postMultipart / postBody', () => {
  it('postMultipart يرسل الحقول والملف ويعيد { status, json }', async () => {
    handler = async (req, res) => {
      const form = await parseMultipart(req);
      const file = form.get('file') as File;
      reply(res, 200, {
        fields: { a: form.get('a'), b: form.get('b') },
        file: { name: file.name, type: file.type, size: file.size },
        auth: req.headers['x-test-key'],
      });
    };
    const r = await postMultipart(
      `${baseUrl}/upload`,
      { headers: { 'x-test-key': DUMMY_KEY }, fields: { a: '1', b: 'two' }, file: { path: fx('tiny-5s.mp4'), filename: 'audio.webm', contentType: 'audio/webm' } },
      { retries: 0 },
    );
    expect(r.status).toBe(200);
    expect(r.json).toEqual({
      fields: { a: '1', b: 'two' },
      file: { name: 'audio.webm', type: 'audio/webm', size: readFileSync(fx('tiny-5s.mp4')).length },
      auth: DUMMY_KEY,
    });
  });

  it('postBody يرسل البايتات كما هي مع Content-Type', async () => {
    handler = (req, res) => reply(res, 200, { len: req.body.length, ct: req.headers['content-type'], first: req.body[0] });
    const body = new Uint8Array([7, 8, 9, 10]);
    const r = await postBody(`${baseUrl}/raw`, { headers: {}, body, contentType: 'audio/webm' }, { retries: 0 });
    expect(r.json).toEqual({ len: 4, ct: 'audio/webm', first: 7 });
  });

  it('401/403 → no_api_key بلا إعادة محاولة، والرسالة لا تحوي المفتاح', async () => {
    handler = (_req, res) => reply(res, 401, { err_code: 'INVALID_AUTH', err_msg: 'Invalid credentials.' });
    const p = postBody(`${baseUrl}/x`, { headers: { authorization: `Token ${DUMMY_KEY}` }, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 3 });
    await expect(p).rejects.toBeInstanceOf(ProviderError);
    await expect(p).rejects.toMatchObject({ code: 'no_api_key', status: 401 });
    const err = (await p.catch((e: unknown) => e)) as ProviderError;
    expect(err.message).not.toContain(DUMMY_KEY);
    expect(seen).toHaveLength(1);
  });

  it('402/429 → quota بلا إعادة محاولة', async () => {
    handler = (_req, res) => reply(res, 429, { message: 'rate limit' });
    await expect(postBody(`${baseUrl}/x`, { headers: {}, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 2 })).rejects.toMatchObject({
      code: 'quota',
      status: 429,
    });
    expect(seen).toHaveLength(1);
  });

  it('5xx يُعاد مرة واحدة مع retries=1 ثم ينجح', async () => {
    let n = 0;
    handler = (_req, res) => (++n === 1 ? reply(res, 503, { message: 'busy' }) : reply(res, 200, { ok: true }));
    const r = await postBody(`${baseUrl}/x`, { headers: {}, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 1 });
    expect(r.json).toEqual({ ok: true });
    expect(seen).toHaveLength(2);
  });

  it('5xx مع retries=0 → provider_error مع status', async () => {
    handler = (_req, res) => reply(res, 500, { message: 'boom' });
    await expect(postBody(`${baseUrl}/x`, { headers: {}, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 0 })).rejects.toMatchObject({
      code: 'provider_error',
      status: 500,
    });
  });

  it('جسم 200 ليس JSON → provider_error', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html>');
    };
    await expect(postBody(`${baseUrl}/x`, { headers: {}, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 0 })).rejects.toMatchObject({
      code: 'provider_error',
      status: 200,
    });
  });

  it('content-length أكبر من السقف → provider_error بلا قراءة الجسم (مراجعة US1 #4)', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json', 'content-length': String(65 * 1024 * 1024) });
      res.end(); // الرأس يكفي؛ لا نرسل الجسم
    };
    await expect(postBody(`${baseUrl}/big`, { headers: {}, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 0 })).rejects.toMatchObject({
      code: 'provider_error',
      status: 200,
    });
  });

  it('جسم مجزّأ (بلا content-length) يتجاوز السقف أثناء التدفق → provider_error', async () => {
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      const chunk = Buffer.alloc(256 * 1024, 0x20);
      for (let i = 0; i < 8; i++) res.write(chunk); // 2 MB مجزّأة
      res.end('{}');
    };
    await expect(
      postBody(`${baseUrl}/stream`, { headers: {}, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 0, maxBodyBytes: 1024 * 1024 }),
    ).rejects.toMatchObject({ code: 'provider_error', status: 200 });
  });

  it('302 لا يُتبع (الترويسة تحمل المفتاح) → provider_error بحالة 302', async () => {
    let hits = 0;
    handler = (_req, res) => {
      hits++;
      res.writeHead(302, { location: `${baseUrl}/elsewhere` });
      res.end();
    };
    await expect(postBody(`${baseUrl}/x`, { headers: { authorization: `Token ${DUMMY_KEY}` }, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 0 })).rejects.toMatchObject({
      code: 'provider_error',
      status: 302,
    });
    expect(hits).toBe(1);
  });

  it('منفذ مغلق → offline', async () => {
    const closed = createServer();
    await new Promise<void>((r) => closed.listen(0, '127.0.0.1', r));
    const port = (closed.address() as AddressInfo).port;
    await new Promise<void>((r) => closed.close(() => r()));
    await expect(postBody(`http://127.0.0.1:${port}/x`, { headers: {}, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 0 })).rejects.toMatchObject({
      code: 'offline',
    });
  });

  it('المهلة → timeout', async () => {
    handler = () => {
      /* لا نجيب أبداً */
    };
    await expect(
      postBody(`${baseUrl}/hang`, { headers: {}, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 0, timeoutMs: 200 }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('إلغاء المستخدم → aborted بلا إعادة محاولة', async () => {
    const ac = new AbortController();
    handler = () => ac.abort();
    await expect(
      postBody(`${baseUrl}/hang`, { headers: {}, body: new Uint8Array(1), contentType: 'audio/webm' }, { retries: 3, signal: ac.signal }),
    ).rejects.toMatchObject({ code: 'aborted' });
    expect(seen).toHaveLength(1);
  });
});

describe('deepgram.ts / elevenlabs.ts', () => {
  it('Deepgram: المسار والاستعلام (mip_opt_out=true دائماً) والترويسة والجسم الخام', async () => {
    handler = (_req, res) => reply(res, 200, deepgramArSa);
    const audio = fx('tiny-5s.mp4');
    const r = await transcribeDeepgram({ audioPath: audio, apiKey: DUMMY_KEY, language: 'ar-SA', model: 'nova-3', baseUrl });
    expect(r.raw).toEqual(deepgramArSa);
    expect(r.modelParams).toEqual({ model: 'nova-3', language: 'ar-SA', punctuate: true, smart_format: false, mip_opt_out: true });

    const req = seen[0]!;
    const u = new URL(req.url, baseUrl);
    expect(req.method).toBe('POST');
    expect(u.pathname).toBe('/v1/listen');
    expect(Object.fromEntries(u.searchParams)).toEqual({ model: 'nova-3', language: 'ar-SA', punctuate: 'true', smart_format: 'false', mip_opt_out: 'true' });
    expect(req.headers['authorization']).toBe(`Token ${DUMMY_KEY}`);
    expect(req.headers['content-type']).toBe('audio/webm');
    expect(req.body.equals(readFileSync(audio))).toBe(true);
  });

  it('ElevenLabs: multipart مع model_id/timestamps_granularity/language_code والترويسة xi-api-key', async () => {
    handler = async (req, res) => {
      const form = await parseMultipart(req);
      const file = form.get('file') as File;
      reply(res, 200, { ...elevenlabsScribe, _echo: { model_id: form.get('model_id'), gran: form.get('timestamps_granularity'), lang: form.get('language_code'), size: file.size, type: file.type } });
    };
    const audio = fx('tiny-5s.mp4');
    const r = await transcribeElevenLabs({ audioPath: audio, apiKey: DUMMY_KEY, language: 'ar', model: 'scribe_v2', baseUrl });
    expect(r.modelParams).toEqual({ model_id: 'scribe_v2', timestamps_granularity: 'word', language_code: 'ar' });
    expect((r.raw as { _echo: unknown })._echo).toEqual({ model_id: 'scribe_v2', gran: 'word', lang: 'ar', size: readFileSync(audio).length, type: 'audio/webm' });
    const req = seen[0]!;
    expect(new URL(req.url, baseUrl).pathname).toBe('/v1/speech-to-text');
    expect(req.headers['xi-api-key']).toBe(DUMMY_KEY);
  });
});

function fakeSecrets(): Secrets & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    available: () => ({ ok: true }),
    list: async () => [{ name: 'deepgram', last4: 'cdef', createdAt: '2026-10-28T00:00:00.000Z' }],
    set: async () => {},
    delete: async () => {},
    async withSecret(name, fn) {
      calls.push(name);
      return fn(DUMMY_KEY);
    },
    keyRef: async (name) => (name === 'deepgram' ? `${name} (…cdef)` : null),
  };
}

describe('runTranscriptionJob', () => {
  it('المسار الكامل: الحالات بالترتيب، الصوت يُحذف، الخام يُحفظ، sendLog يُسجَّل، المفتاح لا يُكتب', async () => {
    handler = (_req, res) => reply(res, 200, deepgramArSa);
    const root = join(tmp, 'job-ok');
    const cacheDir = join(root, 'cache');
    const settings = createSettingsStore(root);
    const secrets = fakeSecrets();
    const states: Array<[JobState, number]> = [];

    const t = await runTranscriptionJob({
      bins,
      secrets,
      settings,
      projectCacheDir: cacheDir,
      sourcePath: fx('tiny-5s.mp4'),
      provider: 'deepgram',
      model: 'nova-3',
      language: 'ar-SA',
      baseUrl,
      now: () => '2026-10-28T07:00:00.000Z',
      onProgress: (s, p) => states.push([s, p]),
    });

    expect(() => validateTranscript(t)).not.toThrow();
    expect(t.provider).toBe('deepgram');
    expect(t.words).toHaveLength(7);
    expect(t.modelParams).toMatchObject({ mip_opt_out: true, language: 'ar-SA' });
    expect(t.audioSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(Math.abs(t.durationUs - 5_000_000)).toBeLessThanOrEqual(100_000);
    expect(t.createdAt).toBe('2026-10-28T07:00:00.000Z');
    expect(t.rawRef).toBe('cache/transcript-raw.json');

    const seq = states.map(([s]) => s);
    expect(seq.filter((s, i) => seq.indexOf(s) === i)).toEqual(['extracting_audio', 'uploading', 'transcribing', 'done']);
    for (const [, p] of states) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    expect(states[states.length - 1]).toEqual(['done', 1]);

    // FR-017: الصوت المستخرج يُحذف بعد النجاح؛ الخام يبقى للمراجعة
    expect(existsSync(join(cacheDir, 'audio.webm'))).toBe(false);
    const rawText = readFileSync(join(cacheDir, 'transcript-raw.json'), 'utf8');
    expect(JSON.parse(rawText)).toEqual(deepgramArSa);
    expect(rawText).not.toContain(DUMMY_KEY);
    expect(JSON.stringify(t)).not.toContain(DUMMY_KEY);

    expect(secrets.calls).toEqual(['deepgram']);
    const s = await settings.load();
    expect(s.transcription.sendLog).toEqual([{ at: '2026-10-28T07:00:00.000Z', provider: 'deepgram', audioDurationUs: t.durationUs }]);
    expect(s.transcription.provider).toBe('deepgram'); // الدمج لا يمسح بقية الإعدادات

    // cache/ للمستخدم وحده (مراجعة US1)
    if (process.platform !== 'win32') expect(statSync(cacheDir).mode & 0o777).toBe(0o700);

    // الجسم المرسَل هو ملف الصوت المستخرج (WebM)، لا الفيديو
    expect(seen[0]!.headers['content-type']).toBe('audio/webm');
    expect(seen[0]!.body.length).toBeLessThan(readFileSync(fx('tiny-5s.mp4')).length);
    expect(seen[0]!.body.subarray(0, 4).toString('hex')).toBe('1a45dfa3'); // EBML header
  });

  it('مفتاح مرفوض → failed ثم ProviderError(no_api_key)، والصوت يُحذف ولا سجل إرسال', async () => {
    handler = (_req, res) => reply(res, 401, { err_code: 'INVALID_AUTH' });
    const root = join(tmp, 'job-401');
    const settings = createSettingsStore(root);
    const states: JobState[] = [];
    const p = runTranscriptionJob({
      bins,
      secrets: fakeSecrets(),
      settings,
      projectCacheDir: join(root, 'cache'),
      sourcePath: fx('tiny-5s.mp4'),
      provider: 'deepgram',
      model: 'nova-3',
      language: 'ar-SA',
      baseUrl,
      onProgress: (s) => states.push(s),
    });
    await expect(p).rejects.toMatchObject({ code: 'no_api_key' });
    expect(states[states.length - 1]).toBe('failed');
    expect(existsSync(join(root, 'cache/audio.webm'))).toBe(false);
    expect((await settings.load()).transcription.sendLog).toEqual([]);
  });

  it('استجابة {} → failed/bad_response، وsendLog يسجّل الإرسال رغم الفشل، والخام يُحذف (مراجعة US1 #1)', async () => {
    handler = (_req, res) => reply(res, 200, {});
    const root = join(tmp, 'job-badresp');
    const settings = createSettingsStore(root);
    const states: JobState[] = [];
    const p = runTranscriptionJob({
      bins,
      secrets: fakeSecrets(),
      settings,
      projectCacheDir: join(root, 'cache'),
      sourcePath: fx('tiny-5s.mp4'),
      provider: 'deepgram',
      model: 'nova-3',
      language: 'ar-SA',
      baseUrl,
      onProgress: (s) => states.push(s),
    });
    await expect(p).rejects.toMatchObject({ code: 'bad_response' });
    expect(states[states.length - 1]).toBe('failed');
    expect(seen).toHaveLength(1); // الصوت غادر الجهاز فعلاً
    const log = (await settings.load()).transcription.sendLog;
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ provider: 'deepgram' });
    expect(existsSync(join(root, 'cache/audio.webm'))).toBe(false);
    expect(existsSync(join(root, 'cache/transcript-raw.json'))).toBe(false);
  });

  it('مصدر بلا صوت → no_audio قبل أي طلب شبكة', async () => {
    const root = join(tmp, 'job-noaudio');
    await expect(
      runTranscriptionJob({
        bins,
        secrets: fakeSecrets(),
        settings: createSettingsStore(root),
        projectCacheDir: join(root, 'cache'),
        sourcePath: fx('tiny-noaudio-5s.mp4'),
        provider: 'elevenlabs',
        model: 'scribe_v2',
        language: 'ar',
        baseUrl,
        onProgress: () => {},
      }),
    ).rejects.toMatchObject({ code: 'no_audio' });
    expect(seen).toHaveLength(0);
  });
});

describe('registerTranscriptionIpc', () => {
  type Listener = (event: IpcEventLike, ...args: unknown[]) => unknown;

  const UI = 'app://ui/index.html';
  const START = { provider: 'deepgram', model: 'nova-3', language: 'ar-SA' };

  async function setup(
    root: string,
    opts: { disclosed?: boolean } = {},
  ): Promise<{
    invoke: <T>(channel: string, url: string, ...args: unknown[]) => Promise<Envelope<T>>;
    events: TranscriptEvent[];
    projects: ReturnType<typeof createProjectStore>;
    settings: ReturnType<typeof createSettingsStore>;
    api: ReturnType<typeof registerTranscriptionIpc>;
  }> {
    const handlers = new Map<string, Listener>();
    const ipc: IpcMainLike = { handle: (channel, listener) => handlers.set(channel, listener) };
    const events: TranscriptEvent[] = [];
    const projects = createProjectStore(root);
    const settings = createSettingsStore(root);
    const api = registerTranscriptionIpc(ipc, {
      isTrustedSender: (url) => url === UI,
      window: () => ({ webContents: { send: (channel: string, payload: unknown) => (channel === 'transcript:event' ? events.push(payload as TranscriptEvent) : 0) } }),
      projects,
      settings,
      secrets: fakeSecrets(),
      bins: () => bins,
      baseUrls: { deepgram: baseUrl, elevenlabs: baseUrl },
    });
    const invoke = async <T,>(channel: string, url: string, ...args: unknown[]): Promise<Envelope<T>> => {
      const h = handlers.get(channel);
      if (!h) throw new Error(`no handler ${channel}`);
      return (await h({ senderFrame: { url } }, ...args)) as never;
    };
    // الإفصاح (FR-017) يُقبل عبر القناة نفسها التي تستعملها الواجهة
    if (opts.disclosed ?? true) expect((await invoke('transcript:acceptDisclosure', UI, 'deepgram')).ok).toBe(true);
    return { events, projects, settings, api, invoke };
  }

  const waitFor = async (pred: () => boolean): Promise<void> => {
    const t0 = Date.now();
    while (!pred()) {
      if (Date.now() - t0 > 30_000) throw new Error('timeout waiting for event');
      await new Promise((r) => setTimeout(r, 25));
    }
  };

  it('start → { jobId } ثم أحداث transcript:event حتى done مع النص', async () => {
    handler = (_req, res) => reply(res, 200, deepgramArSa);
    const root = join(tmp, 'ipc-ok');
    const { invoke, events, projects, api } = await setup(root);
    const doc = makeProject({ id: 'p1', source: { ...makeProject().source, path: fx('tiny-5s.mp4') } });
    await projects.save(doc);

    const r = await invoke<{ jobId: string }>('transcript:start', UI, 'p1', START);
    expect(r.ok).toBe(true);
    const jobId = (r as { ok: true; value: { jobId: string } }).value.jobId;
    expect(typeof jobId).toBe('string');
    expect(api.isRunning('p1')).toBe(true);
    // مهمة واحدة لكل مشروع (مراجعة US1 #6)
    expect(await invoke('transcript:start', UI, 'p1', START)).toMatchObject({ ok: false, error: { code: 'transcript_busy' } });

    await waitFor(() => events.some((e) => e.state === 'done' || e.state === 'failed'));
    expect(api.isRunning('p1')).toBe(false);
    const done = events.find((e) => e.state === 'done')!;
    expect(done).toMatchObject({ projectId: 'p1', jobId, state: 'done', progress: 1 });
    expect(() => validateTranscript(done.transcript)).not.toThrow();
    for (const e of events) expect(e.jobId).toBe(jobId);
    expect(events.map((e) => e.state)).toContain('extracting_audio');
    expect(JSON.stringify(events)).not.toContain(DUMMY_KEY);
    expect(existsSync(join(projects.cacheDir('p1'), 'transcript-raw.json'))).toBe(true);
  });

  it('مرسِل غير موثوق أو وسائط غير صالحة → ok:false بلا تشغيل', async () => {
    const root = join(tmp, 'ipc-bad');
    const { invoke, projects } = await setup(root);
    await projects.save(makeProject({ id: 'p2', source: { ...makeProject().source, path: fx('tiny-5s.mp4') } }));

    const untrusted = await invoke('transcript:start', 'https://evil.example/', 'p2', START);
    expect(untrusted.ok).toBe(false);
    const badProvider = await invoke('transcript:start', UI, 'p2', { provider: 'openai', model: 'whisper-1', language: 'ar' });
    expect(badProvider).toMatchObject({ ok: false, error: { code: 'bad_argument' } });
    const badId = await invoke('transcript:start', UI, '../p2', START);
    expect(badId).toMatchObject({ ok: false, error: { code: 'bad_argument' } });
    const missing = await invoke('transcript:start', UI, 'nope', START);
    expect(missing.ok).toBe(false);
    expect(seen).toHaveLength(0);
  });

  it('بلا إفصاح → disclosure_required ولا طلب شبكة؛ بعد acceptDisclosure يمضي (مراجعة US1 #3)', async () => {
    handler = (_req, res) => reply(res, 200, deepgramArSa);
    const root = join(tmp, 'ipc-disclosure');
    const { invoke, events, projects, settings } = await setup(root, { disclosed: false });
    await projects.save(makeProject({ id: 'p4', source: { ...makeProject().source, path: fx('tiny-5s.mp4') } }));

    expect(await invoke('transcript:start', UI, 'p4', START)).toMatchObject({ ok: false, error: { code: 'disclosure_required' } });
    expect(seen).toHaveLength(0);
    expect((await settings.load()).transcription.disclosures).toEqual([]);

    // مزود بلا مفتاح → secret_not_found لا إفصاح
    expect(await invoke('transcript:acceptDisclosure', UI, 'elevenlabs')).toMatchObject({ ok: false, error: { code: 'secret_not_found' } });
    expect(await invoke('transcript:acceptDisclosure', UI, 'openai')).toMatchObject({ ok: false, error: { code: 'bad_argument' } });
    expect(await invoke('transcript:acceptDisclosure', 'https://evil.example/', 'deepgram')).toMatchObject({ ok: false });

    expect((await invoke('transcript:acceptDisclosure', UI, 'deepgram')).ok).toBe(true);
    const s = await settings.load();
    expect(s.transcription.disclosures).toEqual([{ provider: 'deepgram', keyRef: 'deepgram (…cdef)', acceptedAt: expect.any(String) }]);
    expect(s.transcription.keyRef).toBe('deepgram (…cdef)');
    // قبول ثانٍ لا يكرّر السجل
    expect((await invoke('transcript:acceptDisclosure', UI, 'deepgram')).ok).toBe(true);
    expect((await settings.load()).transcription.disclosures).toHaveLength(1);

    const r = await invoke('transcript:start', UI, 'p4', START);
    expect(r.ok).toBe(true);
    await waitFor(() => events.some((e) => e.state === 'done' || e.state === 'failed'));
    expect(events.at(-1)?.state).toBe('done');
  });

  it('cancel → حدث failed برمز aborted', async () => {
    handler = () => {
      /* نعلّق حتى يُلغى */
    };
    const root = join(tmp, 'ipc-cancel');
    const { invoke, events, projects } = await setup(root);
    await projects.save(makeProject({ id: 'p3', source: { ...makeProject().source, path: fx('tiny-5s.mp4') } }));
    const r = (await invoke<{ jobId: string }>('transcript:start', UI, 'p3', START)) as {
      ok: true;
      value: { jobId: string };
    };
    await waitFor(() => events.some((e) => e.state === 'uploading'));
    const c = await invoke('transcript:cancel', UI, r.value.jobId);
    expect(c.ok).toBe(true);
    await waitFor(() => events.some((e) => e.state === 'failed'));
    expect(events.find((e) => e.state === 'failed')).toMatchObject({ state: 'failed', error: { code: 'aborted' } });
    // إلغاء معرّف غير موجود لا يفشل
    expect((await invoke('transcript:cancel', UI, 'no-such-job')).ok).toBe(true);
  });

  it('cancelAll (before-quit) يلغي المهمة الجارية ولا يبقى audio.webm', async () => {
    handler = () => {
      /* نعلّق حتى يُلغى */
    };
    const root = join(tmp, 'ipc-cancelall');
    const { invoke, events, projects, api } = await setup(root);
    await projects.save(makeProject({ id: 'p5', source: { ...makeProject().source, path: fx('tiny-5s.mp4') } }));
    expect((await invoke('transcript:start', UI, 'p5', START)).ok).toBe(true);
    await waitFor(() => events.some((e) => e.state === 'uploading'));
    api.cancelAll();
    await waitFor(() => events.some((e) => e.state === 'failed'));
    expect(events.find((e) => e.state === 'failed')).toMatchObject({ error: { code: 'aborted' } });
    expect(api.isRunning('p5')).toBe(false);
    expect(existsSync(join(projects.cacheDir('p5'), 'audio.webm'))).toBe(false);
  });
});
