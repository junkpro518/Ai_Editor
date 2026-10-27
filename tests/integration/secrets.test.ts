import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createSecrets } from '../../src/main/secrets';
import type { SafeStorageLike } from '../../src/main/secrets';

// بديل مزيّف لـ safeStorage: تحويل قابل للعكس (عكس النص) — ليس تشفيراً، للاختبار فقط.
function fakeSafeStorage(opts: { available?: boolean; backend?: string } = {}): SafeStorageLike {
  const reverse = (s: string): string => [...s].reverse().join('');
  return {
    isEncryptionAvailable: () => opts.available ?? true,
    getSelectedStorageBackend: opts.backend === undefined ? undefined : () => opts.backend as string,
    encryptString: (s) => Buffer.from(reverse(s), 'utf8'),
    decryptString: (b) => reverse(b.toString('utf8')),
  };
}

const PLAINTEXT = 'sk-live-Zq9Xw2Vb7Nm4Kp1Lr8Tt';

let root: string;
let filePath: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-editor-secrets-'));
  filePath = path.join(root, 'secrets.enc');
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('Secrets', () => {
  it('set ثم withSecret يعطي القيمة داخل الدالة فقط', async () => {
    const secrets = createSecrets({ safeStorage: fakeSafeStorage(), filePath, platform: 'darwin' });
    expect(secrets.available()).toEqual({ ok: true });
    await secrets.set('deepgram', PLAINTEXT);
    const seen = await secrets.withSecret('deepgram', async (value) => value.length);
    expect(seen).toBe(PLAINTEXT.length);
    let captured = '';
    await secrets.withSecret('deepgram', async (value) => {
      captured = value;
    });
    expect(captured).toBe(PLAINTEXT);
  });

  it('النص الصريح لا يظهر في الملف ولا في list ولا في keyRef', async () => {
    const secrets = createSecrets({ safeStorage: fakeSafeStorage(), filePath, platform: 'darwin' });
    await secrets.set('deepgram', PLAINTEXT);

    const bytes = await fs.readFile(filePath);
    expect(bytes.includes(PLAINTEXT)).toBe(false);
    expect(bytes.includes(Buffer.from(PLAINTEXT).toString('base64'))).toBe(false);
    const parsed = JSON.parse(bytes.toString('utf8'));
    expect(parsed.version).toBe(1);
    expect(Object.keys(parsed.entries)).toEqual(['deepgram']);

    const list = await secrets.list();
    expect(JSON.stringify(list)).not.toContain(PLAINTEXT);
    expect(list).toEqual([{ name: 'deepgram', last4: PLAINTEXT.slice(-4), createdAt: expect.any(String) }]);

    const ref = await secrets.keyRef('deepgram');
    expect(ref).toBe(`deepgram (…${PLAINTEXT.slice(-4)})`);
    expect(ref).not.toContain(PLAINTEXT);
    expect(await secrets.keyRef('missing')).toBeNull();

    // الناتج المُعاد من set/delete/withSecret لا يحمل القيمة
    const setResult = await secrets.set('other', PLAINTEXT);
    expect(JSON.stringify(setResult ?? null)).not.toContain(PLAINTEXT);
    const deleteResult = await secrets.delete('other');
    expect(JSON.stringify(deleteResult ?? null)).not.toContain(PLAINTEXT);
  });

  it('المفاتيح القصيرة لا تكشف آخر 4 أحرف', async () => {
    const secrets = createSecrets({ safeStorage: fakeSafeStorage(), filePath, platform: 'darwin' });
    await secrets.set('tiny', 'abc12');
    const [entry] = await secrets.list();
    expect(entry?.last4).toBe('****');
  });

  it('delete يزيل المفتاح و withSecret بعده يرمي secret_not_found', async () => {
    const secrets = createSecrets({ safeStorage: fakeSafeStorage(), filePath, platform: 'darwin' });
    await secrets.set('deepgram', PLAINTEXT);
    await secrets.delete('deepgram');
    expect(await secrets.list()).toEqual([]);
    expect(await secrets.keyRef('deepgram')).toBeNull();
    await expect(secrets.withSecret('deepgram', async () => 1)).rejects.toMatchObject({ code: 'secret_not_found' });
    const bytes = await fs.readFile(filePath, 'utf8');
    expect(bytes).not.toContain(PLAINTEXT);
  });

  it('available يرفض عند غياب التشفير وعلى Linux مع basic_text', async () => {
    const noCrypto = createSecrets({ safeStorage: fakeSafeStorage({ available: false }), filePath, platform: 'darwin' });
    expect(noCrypto.available().ok).toBe(false);
    await expect(noCrypto.set('deepgram', PLAINTEXT)).rejects.toMatchObject({ code: 'secrets_unavailable' });

    const basicText = createSecrets({ safeStorage: fakeSafeStorage({ backend: 'basic_text' }), filePath, platform: 'linux' });
    expect(basicText.available().ok).toBe(false);
    await expect(basicText.set('deepgram', PLAINTEXT)).rejects.toMatchObject({ code: 'secrets_unavailable' });
    await expect(fs.access(filePath)).rejects.toThrow();

    // Linux مع مخزن حقيقي يُقبل؛ basic_text على غير Linux لا يُرفض بهذا السبب
    expect(createSecrets({ safeStorage: fakeSafeStorage({ backend: 'gnome_libsecret' }), filePath, platform: 'linux' }).available()).toEqual({ ok: true });
    expect(createSecrets({ safeStorage: fakeSafeStorage({ backend: 'basic_text' }), filePath, platform: 'darwin' }).available()).toEqual({ ok: true });
  });

  it('ملف الأسرار بوضع 0o600 على POSIX', async () => {
    const secrets = createSecrets({ safeStorage: fakeSafeStorage(), filePath, platform: 'darwin' });
    await secrets.set('deepgram', PLAINTEXT);
    const stat = await fs.stat(filePath);
    if (process.platform !== 'win32') expect(stat.mode & 0o777).toBe(0o600);
    // الكتابة الثانية تحافظ على الوضع
    await secrets.set('second', PLAINTEXT);
    if (process.platform !== 'win32') expect((await fs.stat(filePath)).mode & 0o777).toBe(0o600);
  });

  it('list على ملف غائب يعيد [] و keyRef null', async () => {
    const secrets = createSecrets({ safeStorage: fakeSafeStorage(), filePath, platform: 'darwin' });
    expect(await secrets.list()).toEqual([]);
    expect(await secrets.keyRef('deepgram')).toBeNull();
  });
});
