import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import writeFileAtomic from 'write-file-atomic';

// القرار 18: المفتاح يُفك تشفيره داخل main لحظة الطلب فقط؛ لا يُعاد للواجهة ولا للوكيل ولا للسجلات.

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  getSelectedStorageBackend?(): string;
  encryptString(s: string): Buffer;
  decryptString(b: Buffer): string;
}

export interface Secrets {
  available(): { ok: boolean; reason?: string };
  list(): Promise<Array<{ name: string; last4: string; createdAt: string }>>;
  set(name: string, value: string): Promise<void>;
  delete(name: string): Promise<void>;
  withSecret<T>(name: string, fn: (value: string) => Promise<T>): Promise<T>;
  keyRef(name: string): Promise<string | null>;
}

export class SecretsError extends Error {
  constructor(
    public code: 'secrets_unavailable' | 'secret_not_found' | 'secrets_unreadable',
    message: string,
  ) {
    super(message);
    this.name = 'SecretsError';
  }
}

interface SecretsFile {
  version: 1;
  entries: Record<string, { cipher: string; last4: string; createdAt: string }>;
}

export function createSecrets(deps: { safeStorage: SafeStorageLike; filePath: string; platform: NodeJS.Platform; now?: () => string }): Secrets {
  const { safeStorage, filePath, platform } = deps;
  const now = deps.now ?? (() => new Date().toISOString());

  function available(): { ok: boolean; reason?: string } {
    if (!safeStorage.isEncryptionAvailable()) return { ok: false, reason: 'encryption_unavailable' };
    // على Linux بلا secret store يكتب Electron «تشفيراً» بمفتاح ثابت معروف؛ نرفض الحفظ (R9)
    if (platform === 'linux' && safeStorage.getSelectedStorageBackend?.() === 'basic_text') return { ok: false, reason: 'basic_text' };
    return { ok: true };
  }

  function assertAvailable(): void {
    const a = available();
    if (!a.ok) throw new SecretsError('secrets_unavailable', 'مخزن النظام الآمن غير متاح على هذا الجهاز؛ لا يمكن حفظ المفتاح، أدخله في كل جلسة.');
  }

  async function read(): Promise<SecretsFile> {
    let raw: string;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (e) {
      if ((e as { code?: string }).code === 'ENOENT') return { version: 1, entries: {} };
      throw e;
    }
    try {
      const doc = JSON.parse(raw) as Partial<SecretsFile>;
      if (doc.version !== 1 || typeof doc.entries !== 'object' || doc.entries === null) throw new Error('bad shape');
      return { version: 1, entries: doc.entries };
    } catch {
      throw new SecretsError('secrets_unreadable', 'ملف الأسرار تالف.');
    }
  }

  async function write(doc: SecretsFile): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await writeFileAtomic(filePath, JSON.stringify(doc), { mode: 0o600 });
  }

  return {
    available,

    async list() {
      const { entries } = await read();
      return Object.entries(entries).map(([name, e]) => ({ name, last4: e.last4, createdAt: e.createdAt }));
    },

    async set(name, value) {
      assertAvailable();
      const doc = await read();
      doc.entries[name] = {
        cipher: safeStorage.encryptString(value).toString('base64'),
        // آخر 4 أحرف للعرض فقط؛ المفاتيح القصيرة تُحجب كلياً
        last4: value.length >= 8 ? value.slice(-4) : '****',
        createdAt: now(),
      };
      await write(doc);
    },

    async delete(name) {
      const doc = await read();
      if (!(name in doc.entries)) return;
      delete doc.entries[name];
      await write(doc);
    },

    async withSecret(name, fn) {
      assertAvailable();
      const entry = (await read()).entries[name];
      if (!entry) throw new SecretsError('secret_not_found', `لا يوجد مفتاح محفوظ باسم «${name}».`);
      const value = safeStorage.decryptString(Buffer.from(entry.cipher, 'base64'));
      return fn(value);
    },

    async keyRef(name) {
      const entry = (await read()).entries[name];
      return entry ? `${name} (…${entry.last4})` : null;
    },
  };
}
