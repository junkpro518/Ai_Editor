// T042 — فحص التطابق بعد التصدير من سطر الأوامر (FR-014، SC-002):
//   pnpm acceptance:parity --project <id> --out <mp4> [--refs <dir>] [--user-data <dir>] [--report <dir>] [--psnr <dB>] [--ssim <x>] [--no-control]
// يقرأ المشروع من userData، والصور المرجعية من cache المشروع (parity-refs/ref-NNNNN.png) ما لم يُحدَّد --refs،
// ويكتب report.json وأزواج PNG في --report (افتراضياً out/parity). رمز الخروج 1 عند الفشل.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { expectedFrames } from '../../src/core/time';
import { resolveFfmpeg } from '../../src/main/ffmpeg/paths';
import { checkParity, DEFAULT_THRESHOLDS, listReferencePngs, referenceDir } from '../../src/main/parity';
import type { createProjectStore as CreateProjectStore } from '../../src/main/storage/projects';

// مخزن المشاريع يجرّ validators.generated.js (require داخل حزمة ESM) ويرفضه tsx في وضع ESM؛ نحمّله عبر CJS كما يفعل vitest/electron-vite
const { createProjectStore } = createRequire(import.meta.url)('../../src/main/storage/projects') as { createProjectStore: typeof CreateProjectStore };

function parseArgs(argv: string[]): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      out[a.slice(2)] = next;
      i++;
    } else out[a.slice(2)] = true;
  }
  return out;
}

/** بلا Electron لا نعرف userData يقيناً: الوسيط ← المتغير ← المواضع المعتادة (تطوير ai-editor / حزمة AiEditor). */
function userDataCandidates(explicit: string | undefined): string[] {
  if (explicit) return [resolve(explicit)];
  const env = process.env['AI_EDITOR_USER_DATA'];
  if (env) return [env];
  const home = homedir();
  const base =
    process.platform === 'darwin'
      ? join(home, 'Library/Application Support')
      : process.platform === 'win32'
        ? (process.env['APPDATA'] ?? join(home, 'AppData/Roaming'))
        : (process.env['XDG_CONFIG_HOME'] ?? join(home, '.config'));
  return ['ai-editor', 'AiEditor'].map((n) => join(base, n));
}

// بلا await في المستوى الأعلى: tsx يرفض تحميل validators.generated.js (require) مع TLA في نقطة الدخول
async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));
  const projectId = typeof args['project'] === 'string' ? args['project'] : '';
  const exportPath = typeof args['out'] === 'string' ? resolve(args['out']) : '';
  if (!projectId || !exportPath) {
    console.error('الاستخدام: pnpm acceptance:parity --project <id> --out <mp4> [--refs <dir>] [--user-data <dir>] [--report <dir>]');
    return 2;
  }

  const candidates = userDataCandidates(typeof args['user-data'] === 'string' ? args['user-data'] : undefined);
  const root = candidates.find((d) => existsSync(join(d, 'projects', projectId, 'project.json')));
  if (!root) {
    console.error(`لم نجد المشروع ${projectId}. بحثنا في: ${candidates.join(', ')} — مرّر --user-data <dir>`);
    return 2;
  }

  const store = createProjectStore(root);
  const project = await store.load(projectId);
  const refsDir = typeof args['refs'] === 'string' ? resolve(args['refs']) : referenceDir(store.cacheDir(projectId));
  const referencePngs = await listReferencePngs(refsDir);
  if (!referencePngs.length) console.error(`تحذير: لا صور مرجعية في ${refsDir}`);

  const report = await checkParity(resolveFfmpeg(), {
    exportPath,
    expectedFrames: expectedFrames(project.timeline.clips),
    fps: project.source.fps,
    seed: project.seed,
    projectDir: store.dir(projectId),
    referencePngs,
    outDir: typeof args['report'] === 'string' ? resolve(args['report']) : resolve('out/parity'),
    expectAudio: project.source.hasAudio,
    thresholds: {
      psnrDb: typeof args['psnr'] === 'string' ? Number(args['psnr']) : DEFAULT_THRESHOLDS.psnrDb,
      ssim: typeof args['ssim'] === 'string' ? Number(args['ssim']) : DEFAULT_THRESHOLDS.ssim,
    },
    ...(args['no-control'] || !existsSync(project.source.path)
      ? {}
      : { control: { sourcePath: project.source.path, clips: project.timeline.clips } }),
  });

  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        frames: report.frames,
        audio: report.audio,
        psnrMedian: report.psnrMedian,
        ssimMedian: report.ssimMedian,
        aligned: `${report.perFrame.filter((f) => f.aligned).length}/${report.perFrame.length}`,
        failures: report.failures,
      },
      null,
      2,
    ),
  );
  console.log(report.ok ? 'التطابق: ناجح' : 'التطابق: فاشل');
  return report.ok ? 0 : 1;
}

void main().then((code) => process.exit(code));
