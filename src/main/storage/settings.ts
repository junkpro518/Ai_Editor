import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { isEnoent, readJson, writeJsonAtomic } from './projects';

// data-model.md §1.11
export interface Settings {
  ui: { lang: 'ar' | 'en' };
  transcription: {
    mode: 'cloud';
    provider: string;
    model: string;
    keyRef?: string;
    disclosures: Array<{ provider: string; keyRef: string; acceptedAt: string }>;
    sendLog: Array<{ at: string; provider: string; audioDurationUs: number }>;
  };
  providerProfiles: Record<string, { lowConfidenceThreshold: number }>;
  encoder?: { detectedAt: string; ffmpegVersion: string; h264: Array<{ name: string; hardware: boolean; works: boolean }> };
}

// الرقعة تُدمج سطحياً داخل كل مفتاح علوي: save({ transcription: { keyRef } }) لا يمسح provider/model
export type SettingsPatch = { [K in keyof Settings]?: Partial<Settings[K]> };

/**
 * حقول يكتبها main وحده (مراجعة US1 #3): سجل الإرسال والإفصاحات دليل FR-017 ولا يجوز أن تعدّلهما الواجهة عبر settings:save.
 * ترمي { code: 'bad_argument' }. الدالة منفصلة عن save() لأن main نفسه يكتب هذين الحقلين عبر المخزن.
 */
export function assertRendererSettingsPatch(patch: SettingsPatch): void {
  const t = patch.transcription;
  if (t && ('sendLog' in t || 'disclosures' in t)) {
    throw Object.assign(new Error('الواجهة لا تكتب sendLog/disclosures'), { code: 'bad_argument' });
  }
}

export interface SettingsStore {
  load(): Promise<Settings>;
  save(patch: SettingsPatch): Promise<Settings>;
}

function defaults(): Settings {
  return {
    ui: { lang: 'ar' },
    transcription: { mode: 'cloud', provider: 'deepgram', model: 'nova-3', disclosures: [], sendLog: [] },
    providerProfiles: {},
  };
}

function merge(base: Settings, patch: SettingsPatch): Settings {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = (base as unknown as Record<string, unknown>)[key];
    out[key] = typeof current === 'object' && current !== null && !Array.isArray(current) ? { ...current, ...value } : value;
  }
  return out as unknown as Settings;
}

export function createSettingsStore(rootDir: string): SettingsStore {
  const file = path.join(rootDir, 'settings.json');

  async function load(): Promise<Settings> {
    for (const candidate of [file, `${file}.bak`]) {
      try {
        return merge(defaults(), (await readJson(candidate)) as SettingsPatch);
      } catch {
        // غائب أو تالف → جرّب .bak ثم الافتراضيات
      }
    }
    return defaults();
  }

  return {
    load,
    async save(patch) {
      const next = merge(await load(), patch);
      try {
        await fs.copyFile(file, `${file}.bak`);
      } catch (e) {
        if (!isEnoent(e)) throw e;
      }
      await writeJsonAtomic(file, next);
      return next;
    },
  };
}
