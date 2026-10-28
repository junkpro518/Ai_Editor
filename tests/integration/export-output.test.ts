import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalizeOutputPath, isSameFile } from '../../src/main/export/outputPath';

const repo = fileURLToPath(new URL('../..', import.meta.url));
const tmp = join(repo, 'out/test-tmp/export-output');

beforeAll(() => {
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
});
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

describe('finalizeOutputPath (مراجعة US1 #5)', () => {
  const existing = new Set(['/v/clip.mp4']);
  const exists = async (p: string): Promise<boolean> => existing.has(p);

  it('.mp4 موجودة → المسار كما هو بلا تأكيد (الحوار أكّده)', async () => {
    expect(await finalizeOutputPath('/v/clip.mp4', exists)).toEqual({ path: '/v/clip.mp4', needsConfirm: false });
    expect(await finalizeOutputPath('/v/CLIP.MP4', exists)).toEqual({ path: '/v/CLIP.MP4', needsConfirm: false });
  });
  it('لاحقة مضافة والملف الجديد غير موجود → بلا تأكيد', async () => {
    expect(await finalizeOutputPath('/v/other', exists)).toEqual({ path: '/v/other.mp4', needsConfirm: false });
  });
  it('لاحقة مضافة والملف الجديد موجود → يلزم تأكيد الاستبدال', async () => {
    expect(await finalizeOutputPath('/v/clip', exists)).toEqual({ path: '/v/clip.mp4', needsConfirm: true });
  });
});

describe('isSameFile (مراجعة US1 #7: output_is_source عبر realpath)', () => {
  it('وصلة رمزية إلى المصدر = نفس الملف؛ مسار آخر غير موجود ≠', async () => {
    const source = join(tmp, 'source.mp4');
    writeFileSync(source, 'x');
    const link = join(tmp, 'link.mp4');
    symlinkSync(source, link);
    expect(await isSameFile(link, source)).toBe(true);
    expect(await isSameFile(source, link)).toBe(true);
    expect(await isSameFile(join(tmp, 'sub', '..', 'source.mp4'), source)).toBe(true);
    expect(await isSameFile(join(tmp, 'new-output.mp4'), source)).toBe(false);
    // مجلد وصلة رمزية + ملف إخراج غير موجود: الملف غير موجود فلا realpath له، ويُقارَن محلولاً كما هو (حدّ معروف)
    const dirLink = join(tmp, 'dirlink');
    symlinkSync(tmp, dirLink);
    expect(await isSameFile(join(dirLink, 'nope.mp4'), source)).toBe(false);
  });
});
