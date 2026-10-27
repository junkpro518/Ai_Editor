import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { StyleVersion } from '../../core/contracts/types';
import { validateStyle } from '../../core/contracts/validate';
import { StorageError, readJson, writeJsonAtomic } from './projects';

export interface StyleStore {
  saveVersion(sv: StyleVersion): Promise<void>;
  loadVersion(styleId: string, version: number): Promise<StyleVersion>;
  listVersions(styleId: string): Promise<Array<{ version: number; date: string; reason: string }>>;
  latest(styleId: string): Promise<StyleVersion | null>;
  ensureDefault(defaultJsonPath: string): Promise<StyleVersion>;
}

const VERSION_RE = /^v(\d+)\.json$/;

async function exists(file: string): Promise<boolean> {
  return fs.access(file).then(
    () => true,
    () => false,
  );
}

export function createStyleStore(rootDir: string): StyleStore {
  const file = (styleId: string, version: number): string => path.join(rootDir, 'styles', styleId, `v${version}.json`);

  async function versionsOf(styleId: string): Promise<number[]> {
    let names: string[];
    try {
      names = await fs.readdir(path.join(rootDir, 'styles', styleId));
    } catch {
      return [];
    }
    return names
      .map((n) => VERSION_RE.exec(n))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => Number(m[1]))
      .sort((a, b) => a - b);
  }

  const store: StyleStore = {
    async saveVersion(sv) {
      validateStyle(sv);
      const target = file(sv.styleId, sv.version);
      // الإصدارات لا تُعدَّل في مكانها أبداً (data-model §1.7)
      if (await exists(target)) throw new StorageError('version_exists', `الإصدار ${sv.version} من النمط «${sv.styleId}» موجود مسبقاً.`);
      await writeJsonAtomic(target, sv);
    },

    async loadVersion(styleId, version) {
      let doc: unknown;
      try {
        doc = await readJson(file(styleId, version));
      } catch (e) {
        throw new StorageError('style_not_found', `الإصدار ${version} من النمط «${styleId}» غير موجود.`, e);
      }
      validateStyle(doc);
      return doc;
    },

    async listVersions(styleId) {
      const versions = await versionsOf(styleId);
      return Promise.all(
        versions.map(async (version) => {
          const sv = await store.loadVersion(styleId, version);
          return { version: sv.version, date: sv.date, reason: sv.reason };
        }),
      );
    },

    async latest(styleId) {
      const versions = await versionsOf(styleId);
      const last = versions.at(-1);
      return last === undefined ? null : store.loadVersion(styleId, last);
    },

    async ensureDefault(defaultJsonPath) {
      const doc = await readJson(defaultJsonPath);
      validateStyle(doc);
      if (await exists(file(doc.styleId, doc.version))) return store.loadVersion(doc.styleId, doc.version);
      await store.saveVersion(doc);
      return doc;
    },
  };
  return store;
}
