import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { createProjectStore } from '../../src/main/storage/projects';
import { createStyleStore } from '../../src/main/storage/styles';
import { createSettingsStore } from '../../src/main/storage/settings';
import type { ProjectDocument, StyleVersion } from '../../src/core/contracts/types';
import type { HistoryEntry } from '../../src/core/history/snapshots';

const DEFAULT_STYLE = path.resolve('resources/styles/default-v1.json');

// مستند مشروع صالح يُبنى داخل الاختبار (بلا اعتماد على مساعد خارجي).
function makeProject(id = 'p1', name = 'مشروع'): ProjectDocument {
  return {
    schemaVersion: 1,
    id,
    name,
    createdAt: '2026-10-28T00:00:00.000Z',
    updatedAt: '2026-10-28T00:00:00.000Z',
    seed: 42,
    source: {
      id: 'src1',
      path: '/tmp/tiny-5s.mp4',
      fileName: 'tiny-5s.mp4',
      hash: 'a'.repeat(64),
      durationUs: 10_010_000,
      fps: { num: 30000, den: 1001 },
      frameCount: 300,
      width: 1920,
      height: 1080,
      hasAudio: true,
    },
    style: { styleId: 'default', version: 1 },
    transcript: null,
    transcriptJob: { state: 'idle' },
    timeline: { clips: [{ id: 'c1', sourceId: 'src1', inFrame: 0, outFrame: 300, timelineStartFrame: 0 }] },
    captions: { enabled: false, cues: [] },
    proposals: [],
    corrections: [],
    styleUpdateProposals: [],
  };
}

function makeEntry(seq: number, project: ProjectDocument): HistoryEntry {
  return {
    seq,
    at: '2026-10-28T00:00:00.000Z',
    actor: 'user',
    command: { name: 'captions.toggle', params: {} },
    description: `أمر ${seq}`,
    snapshot: project,
  };
}

async function readDefaultStyle(): Promise<StyleVersion> {
  return JSON.parse(await fs.readFile(DEFAULT_STYLE, 'utf8')) as StyleVersion;
}

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-editor-storage-'));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('ProjectStore', () => {
  it('save يكتب project.json ويحفظ النسخة السابقة في .bak', async () => {
    const store = createProjectStore(root);
    const p = makeProject();
    await store.save(p);
    const file = path.join(store.dir('p1'), 'project.json');
    expect(JSON.parse(await fs.readFile(file, 'utf8'))).toEqual(p);
    await expect(fs.access(`${file}.bak`)).rejects.toThrow();

    const p2 = { ...p, name: 'بعد التعديل', updatedAt: '2026-10-28T01:00:00.000Z' };
    await store.save(p2);
    expect(JSON.parse(await fs.readFile(file, 'utf8'))).toEqual(p2);
    expect(JSON.parse(await fs.readFile(`${file}.bak`, 'utf8'))).toEqual(p);
    // لا ملفات مؤقتة متبقية من الكتابة الذرية
    const names = await fs.readdir(store.dir('p1'));
    expect(names.filter((n) => !['project.json', 'project.json.bak', 'snapshots', 'cache'].includes(n))).toEqual([]);
  });

  it('load يعيد المستند بعد التحقق', async () => {
    const store = createProjectStore(root);
    const p = makeProject();
    await store.save(p);
    expect(await store.load('p1')).toEqual(p);
  });

  it('load يسترجع من .bak عند تلف project.json ويعيد تسمية الملف التالف', async () => {
    const store = createProjectStore(root);
    const p = makeProject();
    await store.save(p);
    const p2 = { ...p, name: 'الثاني' };
    await store.save(p2);
    const file = path.join(store.dir('p1'), 'project.json');
    await fs.writeFile(file, '{ this is not json');

    const loaded = await store.load('p1');
    expect(loaded).toEqual(p); // محتوى .bak
    const names = await fs.readdir(store.dir('p1'));
    expect(names.some((n) => n.startsWith('project.json.corrupt-'))).toBe(true);
  });

  it('load يرمي project_unreadable عند تلف الملف و.bak معاً', async () => {
    const store = createProjectStore(root);
    await store.save(makeProject());
    const file = path.join(store.dir('p1'), 'project.json');
    await fs.writeFile(file, 'garbage');
    await fs.writeFile(`${file}.bak`, 'garbage too');
    await expect(store.load('p1')).rejects.toMatchObject({ code: 'project_unreadable' });
  });

  it('load يرفض مستنداً صالح JSON لكنه يخالف العقد', async () => {
    const store = createProjectStore(root);
    await fs.mkdir(store.dir('p1'), { recursive: true });
    const bad = { ...makeProject(), timeline: { clips: [] }, seed: 'x' };
    await fs.writeFile(path.join(store.dir('p1'), 'project.json'), JSON.stringify(bad));
    await expect(store.load('p1')).rejects.toMatchObject({ code: 'project_unreadable' });
  });

  it('writeSnapshot يكتب snapshots/000001.json ويقرأها readSnapshots تصاعدياً', async () => {
    const store = createProjectStore(root);
    const p = makeProject();
    await store.save(p);
    await store.writeSnapshot('p1', makeEntry(2, p));
    await store.writeSnapshot('p1', makeEntry(1, p));
    await store.writeSnapshot('p1', makeEntry(10, p));
    const names = (await fs.readdir(path.join(store.dir('p1'), 'snapshots'))).sort();
    expect(names).toEqual(['000001.json', '000002.json', '000010.json']);
    const entries = await store.readSnapshots('p1');
    expect(entries.map((e) => e.seq)).toEqual([1, 2, 10]);
    expect(entries[0]?.snapshot).toEqual(p);
  });

  it('pruneSnapshots يبقي أحدث 200 من 205 ويعيد عدد المحذوف', async () => {
    const store = createProjectStore(root);
    const p = makeProject();
    for (let seq = 1; seq <= 205; seq++) await store.writeSnapshot('p1', makeEntry(seq, p));
    const removed = await store.pruneSnapshots('p1', 200);
    expect(removed).toBe(5);
    const entries = await store.readSnapshots('p1');
    expect(entries).toHaveLength(200);
    expect(entries[0]?.seq).toBe(6);
    expect(entries[199]?.seq).toBe(205);
    expect(await store.pruneSnapshots('p1')).toBe(0);
  });

  it('list يعيد id/name/updatedAt لكل مشروع', async () => {
    const store = createProjectStore(root);
    await store.save(makeProject('a', 'الأول'));
    await store.save({ ...makeProject('b', 'الثاني'), updatedAt: '2026-10-29T00:00:00.000Z' });
    const list = await store.list();
    expect(list).toEqual([
      { id: 'b', name: 'الثاني', updatedAt: '2026-10-29T00:00:00.000Z' },
      { id: 'a', name: 'الأول', updatedAt: '2026-10-28T00:00:00.000Z' },
    ]);
  });

  it('list على جذر فارغ يعيد [] و remove يحذف مجلد المشروع', async () => {
    const store = createProjectStore(root);
    expect(await store.list()).toEqual([]);
    await store.save(makeProject());
    expect(store.cacheDir('p1')).toBe(path.join(store.dir('p1'), 'cache'));
    await store.remove('p1');
    await expect(fs.access(store.dir('p1'))).rejects.toThrow();
    expect(await store.list()).toEqual([]);
  });
});

describe('StyleStore', () => {
  it('saveVersion مرتين بنفس الإصدار يرمي version_exists ولا يعدّل الملف', async () => {
    const store = createStyleStore(root);
    const sv = await readDefaultStyle();
    await store.saveVersion(sv);
    const modified = { ...sv, styleGuide: 'نسخة معدّلة' };
    await expect(store.saveVersion(modified)).rejects.toMatchObject({ code: 'version_exists' });
    expect(await store.loadVersion('default', 1)).toEqual(sv);
  });

  it('listVersions مرتّبة تصاعدياً و latest يعيد الأعلى', async () => {
    const store = createStyleStore(root);
    const sv = await readDefaultStyle();
    const v = (version: number, reason: string): StyleVersion => ({ ...sv, version, reason, date: `2026-10-${27 + version}T00:00:00.000Z` });
    await store.saveVersion(v(3, 'learned'));
    await store.saveVersion(v(1, 'default'));
    await store.saveVersion(v(2, 'manual'));
    expect(await store.listVersions('default')).toEqual([
      { version: 1, date: '2026-10-28T00:00:00.000Z', reason: 'default' },
      { version: 2, date: '2026-10-29T00:00:00.000Z', reason: 'manual' },
      { version: 3, date: '2026-10-30T00:00:00.000Z', reason: 'learned' },
    ]);
    expect((await store.latest('default'))?.version).toBe(3);
    expect(await store.latest('missing')).toBeNull();
    expect(await store.listVersions('missing')).toEqual([]);
  });

  it('ensureDefault ينسخ default-v1.json كإصدار 1 مرة واحدة فقط', async () => {
    const store = createStyleStore(root);
    const first = await store.ensureDefault(DEFAULT_STYLE);
    expect(first.version).toBe(1);
    expect(first.styleId).toBe('default');
    const file = path.join(root, 'styles', 'default', 'v1.json');
    const bytesBefore = await fs.readFile(file, 'utf8');

    // ملف افتراضي مختلف على القرص: لا يُستبدل الإصدار 1 الموجود
    const altered = path.join(root, 'default-v1-altered.json');
    await fs.writeFile(altered, JSON.stringify({ ...first, styleGuide: 'نسخة مختلفة' }));
    const second = await store.ensureDefault(altered);
    expect(second).toEqual(first);
    expect(await fs.readFile(file, 'utf8')).toBe(bytesBefore);
    expect(await store.listVersions('default')).toHaveLength(1);
  });

  it('loadVersion يرمي style_not_found للإصدار الغائب', async () => {
    const store = createStyleStore(root);
    await expect(store.loadVersion('default', 9)).rejects.toMatchObject({ code: 'style_not_found' });
  });
});

describe('SettingsStore', () => {
  it('load يعيد الافتراضيات عند غياب الملف', async () => {
    const store = createSettingsStore(root);
    const s = await store.load();
    expect(s.ui.lang).toBe('ar');
    expect(s.transcription.mode).toBe('cloud');
    expect(s.transcription.provider).toBe('deepgram');
    expect(s.transcription.model).toBe('nova-3');
    expect(s.transcription.disclosures).toEqual([]);
    expect(s.transcription.sendLog).toEqual([]);
    expect(s.providerProfiles).toEqual({});
    expect(s.encoder).toBeUndefined();
  });

  it('save(patch) يدمج سطحياً لكل مفتاح علوي ويثبّت على القرص', async () => {
    const store = createSettingsStore(root);
    const after = await store.save({ ui: { lang: 'en' } });
    expect(after.ui.lang).toBe('en');
    expect(after.transcription.provider).toBe('deepgram');

    const patched = await store.save({
      transcription: { keyRef: 'deepgram (…1234)', sendLog: [{ at: '2026-10-28T00:00:00.000Z', provider: 'deepgram', audioDurationUs: 5_000_000 }] },
      providerProfiles: { 'deepgram/nova-3': { lowConfidenceThreshold: 0.6 } },
    });
    expect(patched.ui.lang).toBe('en');
    expect(patched.transcription).toEqual({
      mode: 'cloud',
      provider: 'deepgram',
      model: 'nova-3',
      keyRef: 'deepgram (…1234)',
      disclosures: [],
      sendLog: [{ at: '2026-10-28T00:00:00.000Z', provider: 'deepgram', audioDurationUs: 5_000_000 }],
    });

    const reloaded = await createSettingsStore(root).load();
    expect(reloaded).toEqual(patched);
    expect(JSON.parse(await fs.readFile(path.join(root, 'settings.json'), 'utf8'))).toEqual(patched);
  });
});
