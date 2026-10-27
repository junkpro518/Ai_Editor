import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import writeFileAtomic from 'write-file-atomic';
import type { ProjectDocument } from '../../core/contracts/types';
import type { HistoryEntry } from '../../core/history/snapshots';
import { validateProject } from '../../core/contracts/validate';

export class StorageError extends Error {
  constructor(
    public code: string,
    message: string,
    public override cause?: unknown,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export interface ProjectStore {
  dir(id: string): string;
  cacheDir(id: string): string;
  save(doc: ProjectDocument): Promise<void>;
  load(id: string): Promise<ProjectDocument>;
  list(): Promise<Array<{ id: string; name: string; updatedAt: string }>>;
  writeSnapshot(id: string, entry: HistoryEntry): Promise<void>;
  readSnapshots(id: string): Promise<HistoryEntry[]>;
  pruneSnapshots(id: string, keep?: number): Promise<number>;
  remove(id: string): Promise<void>;
}

const SNAPSHOT_RE = /^(\d{6})\.json$/;

export async function writeJsonAtomic(file: string, value: unknown, mode?: number): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await writeFileAtomic(file, JSON.stringify(value, null, 2), mode === undefined ? {} : { mode });
}

export async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await fs.readFile(file, 'utf8')) as unknown;
}

export function isEnoent(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === 'ENOENT';
}

async function readValidProject(file: string): Promise<ProjectDocument> {
  const doc = await readJson(file);
  validateProject(doc);
  return doc;
}

export function createProjectStore(rootDir: string): ProjectStore {
  const projectsRoot = path.join(rootDir, 'projects');
  const dir = (id: string): string => path.join(projectsRoot, id);
  const file = (id: string): string => path.join(dir(id), 'project.json');
  const snapshotsDir = (id: string): string => path.join(dir(id), 'snapshots');

  async function listSnapshotFiles(id: string): Promise<Array<{ seq: number; file: string }>> {
    let names: string[];
    try {
      names = await fs.readdir(snapshotsDir(id));
    } catch (e) {
      if (isEnoent(e)) return [];
      throw e;
    }
    return names
      .map((n) => ({ m: SNAPSHOT_RE.exec(n), n }))
      .filter((x): x is { m: RegExpExecArray; n: string } => x.m !== null)
      .map(({ m, n }) => ({ seq: Number(m[1]), file: path.join(snapshotsDir(id), n) }))
      .sort((a, b) => a.seq - b.seq);
  }

  return {
    dir,
    cacheDir: (id) => path.join(dir(id), 'cache'),

    async save(doc) {
      const target = file(doc.id);
      await fs.mkdir(dir(doc.id), { recursive: true });
      // النسخة السابقة → .bak قبل الاستبدال الذري
      try {
        await fs.copyFile(target, `${target}.bak`);
      } catch (e) {
        if (!isEnoent(e)) throw e;
      }
      await writeJsonAtomic(target, doc);
    },

    async load(id) {
      const target = file(id);
      try {
        return await readValidProject(target);
      } catch (primary) {
        if (!isEnoent(primary)) {
          // الملف موجود لكنه تالف: نُبعده باسم مميّز ثم نحاول .bak
          await fs.rename(target, `${target}.corrupt-${Date.now()}`).catch(() => undefined);
        }
        try {
          return await readValidProject(`${target}.bak`);
        } catch (backup) {
          throw new StorageError('project_unreadable', `تعذّر قراءة ملف المشروع «${id}» ونسخته الاحتياطية.`, { primary, backup });
        }
      }
    },

    async list() {
      let ids: string[];
      try {
        ids = (await fs.readdir(projectsRoot, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
      } catch (e) {
        if (isEnoent(e)) return [];
        throw e;
      }
      const out: Array<{ id: string; name: string; updatedAt: string }> = [];
      for (const id of ids) {
        // قراءة خفيفة بلا تحقق كامل ولا آثار جانبية؛ المشاريع غير القابلة للقراءة تُتجاوز
        for (const candidate of [file(id), `${file(id)}.bak`]) {
          try {
            const doc = (await readJson(candidate)) as Partial<ProjectDocument>;
            if (typeof doc.id === 'string' && typeof doc.name === 'string' && typeof doc.updatedAt === 'string') {
              out.push({ id: doc.id, name: doc.name, updatedAt: doc.updatedAt });
              break;
            }
          } catch {
            // جرّب التالي
          }
        }
      }
      return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
    },

    async writeSnapshot(id, entry) {
      await writeJsonAtomic(path.join(snapshotsDir(id), `${String(entry.seq).padStart(6, '0')}.json`), entry);
    },

    async readSnapshots(id) {
      const files = await listSnapshotFiles(id);
      return Promise.all(files.map((f) => readJson(f.file) as Promise<HistoryEntry>));
    },

    async pruneSnapshots(id, keep = 200) {
      const files = await listSnapshotFiles(id);
      const excess = Math.max(0, files.length - keep);
      await Promise.all(files.slice(0, excess).map((f) => fs.unlink(f.file)));
      return excess;
    },

    async remove(id) {
      await fs.rm(dir(id), { recursive: true, force: true });
    },
  };
}
