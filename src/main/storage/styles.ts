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
const STYLE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** الحارس في المخزن نفسه (مراجعة US3): styleId وversion من الواجهة يصيران مساراً — لا يخرج عن userData/styles */
function badArgument(what: string): never {
  throw new StorageError('bad_argument', `وسيط غير صالح: ${what}`);
}

async function exists(file: string): Promise<boolean> {
  return fs.access(file).then(
    () => true,
    () => false,
  );
}

export function createStyleStore(rootDir: string): StyleStore {
  const stylesRoot = path.resolve(rootDir, 'styles');
  const styleDir = (styleId: string): string => {
    if (typeof styleId !== 'string' || !STYLE_ID_RE.test(styleId)) badArgument('styleId');
    const dir = path.resolve(stylesRoot, styleId);
    if (path.dirname(dir) !== stylesRoot) badArgument('styleId');
    return dir;
  };
  const file = (styleId: string, version: number): string => {
    if (!Number.isSafeInteger(version) || version < 1) badArgument('version');
    return path.join(styleDir(styleId), `v${version}.json`);
  };

  async function versionsOf(styleId: string): Promise<number[]> {
    const dir = styleDir(styleId);
    let names: string[];
    try {
      names = await fs.readdir(dir);
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
      const target = file(sv.styleId, sv.version); // المخطط يفرض النمط نفسه؛ الحارس يضيف الحدّ الآمن للعدد
      // الإصدارات لا تُعدَّل في مكانها أبداً (data-model §1.7)
      if (await exists(target)) throw new StorageError('version_exists', `الإصدار ${sv.version} من النمط «${sv.styleId}» موجود مسبقاً.`);
      await writeJsonAtomic(target, sv);
    },

    async loadVersion(styleId, version) {
      const target = file(styleId, version);
      let doc: unknown;
      try {
        doc = await readJson(target);
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
