import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import type { BrowserWindow } from 'electron';
import { dialog } from 'electron';
import type { Rational } from '../../core/time';
import type { FfmpegBins } from '../ffmpeg/paths';
import { mux } from '../ffmpeg/mux';
import type { EdlRange } from '../ffmpeg/mux';
import { FfmpegError } from '../ffmpeg/process';
import { ArgError, absPath, id, int, makeHandle, obj, str } from '../ipc';
import type { IpcDeps } from '../ipc';
import { checkParity, listReferencePngs, referenceDir, referencePngName } from '../parity';
import type { ParityInput } from '../parity';
import type { ProjectStore } from '../storage/projects';

// قنوات التصدير (T050/T051): الواجهة ترمّز (WebCodecs) وترسل كتل Annex-B بالترتيب؛ main يدمجها بـFFmpeg.
// نفس نموذج الأمان في ipc.ts: مسار الإخراج يجب أن يكون قد اختير عبر حوار الحفظ في هذه الجلسة (إلا في الاختبار)،
// ومسار المصدر يُقرأ من المشروع المحفوظ لا من الواجهة.

export interface ExportIpcDeps {
  isTrustedSender: IpcDeps['isTrustedSender'];
  window: () => BrowserWindow | null;
  projects: ProjectStore;
  bins: () => FfmpegBins;
  isTest: boolean;
}

export interface ExportStartOptions {
  outputPath: string;
  expectedFrames: number;
  fps: Rational;
  edl: EdlRange[];
  /** المسار الاحتياطي: إطارات RGBA خام تُرمَّز بمشفّر FFmpeg عتادي (بلا مشفّر WebCodecs) */
  raw?: { width: number; height: number; encoder: string };
}

/** فحص التطابق بعد التصدير (FR-014): العدّ ومدة الصوت (R3 الطبقة 3) وPSNR/SSIM عند الفهارس المبذورة (الطبقة 2) من src/main/parity.ts (T042). */
export interface ParityCheck {
  status: 'ok' | 'failed';
  frames: { expected: number; actual: number; ok: boolean };
  audio: { durationUs: number; ok: boolean } | null;
  psnrMedian: number;
  ssimMedian: number;
  /** العتبات أولية حتى قياس الماك (measurements.md) */
  thresholds: { psnrDb: number; ssim: number };
  failures: string[];
  /** report.json والصور (المرجعية والمفكوكة) للمراجع البشري (SC-002) */
  reportDir: string;
}

export interface ExportFinishResult {
  path: string;
  frames: number;
  durationUs: number;
  bytes: number;
  /** صور PNG المرجعية عند الفهارس المبذورة (parity-refs/ref-NNNNN.png — اتفاقية parity.ts) */
  referenceDir: string;
  parityCheck: ParityCheck;
}

interface Session {
  projectId: string;
  outputPath: string;
  expectedFrames: number;
  fps: Rational;
  hasAudio: boolean;
  control: NonNullable<ParityInput['control']>;
  seed: number;
  stdin: PassThrough;
  mux: Promise<unknown>;
  abort: AbortController;
  refDir: string;
  refCount: number;
  lastTimestampUs: number;
  finished: boolean;
}

const MAX_CHUNK = 64 * 1024 * 1024;
const MAX_PNG = 32 * 1024 * 1024;
const MAX_REFS = 64;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function fail(code: string, message: string): Error {
  return Object.assign(new Error(message), { code });
}

const bytesOf = (v: unknown, what: string, max: number): Buffer => {
  if (v instanceof ArrayBuffer) {
    if (v.byteLength === 0 || v.byteLength > max) throw new ArgError(`حجم غير صالح: ${what}`);
    return Buffer.from(v);
  }
  if (v instanceof Uint8Array) {
    if (v.byteLength === 0 || v.byteLength > max) throw new ArgError(`حجم غير صالح: ${what}`);
    return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
  }
  throw new ArgError(`وسيط غير صالح: ${what}`);
};

const rational = (v: unknown, what: string): Rational => {
  const r = obj(v, what);
  const num = int(r['num'], `${what}.num`);
  const den = int(r['den'], `${what}.den`);
  if (num === 0 || den === 0) throw new ArgError(`وسيط غير صالح: ${what}`);
  return { num, den };
};

const edlOf = (v: unknown): EdlRange[] => {
  if (!Array.isArray(v) || v.length === 0 || v.length > 10_000) throw new ArgError('وسيط غير صالح: edl');
  return v.map((r, i) => {
    const o = obj(r, `edl[${i}]`);
    const inUs = int(o['inUs'], `edl[${i}].inUs`);
    const outUs = int(o['outUs'], `edl[${i}].outUs`);
    if (outUs <= inUs) throw new ArgError(`مقطع فارغ: edl[${i}]`);
    return { inUs, outUs };
  });
};

const isMp4 = (p: string): boolean => /\.mp4$/i.test(p);

export function registerExportIpc(deps: ExportIpcDeps): void {
  const handle = makeHandle(deps.isTrustedSender);
  const pickedOutputs = new Set<string>();
  const sessions = new Map<string, Session>();

  function session(v: unknown): Session {
    const s = sessions.get(id(v, 'sessionId'));
    if (!s || s.finished) throw new ArgError('جلسة تصدير غير موجودة');
    return s;
  }

  async function discard(sessionId: string, s: Session): Promise<void> {
    sessions.delete(sessionId);
    s.stdin.destroy();
    await s.mux.catch(() => undefined);
    await rm(s.refDir, { recursive: true, force: true }).catch(() => undefined);
  }

  handle('export:pickOutput', async (p) => {
    const defaultPath = absPath(p, 'defaultPath');
    const win = deps.window();
    const opts = {
      defaultPath,
      filters: [{ name: 'MP4', extensions: ['mp4'] }],
      // تأكيد الاستبدال (FR-014): يسأله الحوار نفسه على ويندوز/ماك، وعلى لينكس بهذه الخاصية
      properties: ['showOverwriteConfirmation' as const],
    };
    const r = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts);
    if (r.canceled || !r.filePath) return null;
    const path = isMp4(r.filePath) ? r.filePath : `${r.filePath}.mp4`;
    pickedOutputs.add(path);
    return path;
  });

  handle('export:start', async (p, o) => {
    const projectId = id(p, 'projectId');
    const opts = obj(o, 'options');
    const outputPath = absPath(opts['outputPath'], 'outputPath');
    if (!isMp4(outputPath)) throw new ArgError('مسار الإخراج يجب أن ينتهي بـ .mp4');
    // كل تصدير يحتاج اختياراً جديداً من الحوار: بعد أول كتابة يصير الملف موجوداً ويلزم تأكيد الاستبدال من جديد (FR-014)
    if (!deps.isTest && !pickedOutputs.delete(outputPath)) throw new ArgError('مسار الإخراج لم يُختر عبر حوار الحفظ');
    const expectedFrames = int(opts['expectedFrames'], 'expectedFrames');
    if (expectedFrames === 0) throw new ArgError('وسيط غير صالح: expectedFrames');
    const fps = rational(opts['fps'], 'fps');
    const edl = edlOf(opts['edl']);
    let raw: ExportStartOptions['raw'];
    if (opts['raw'] !== undefined) {
      const r = obj(opts['raw'], 'raw');
      const encoder = str(r['encoder'], 'raw.encoder');
      if (!/^h264_[a-z0-9]+$/.test(encoder)) throw new ArgError('مشفّر غير صالح');
      raw = { width: int(r['width'], 'raw.width'), height: int(r['height'], 'raw.height'), encoder };
    }
    if ([...sessions.values()].some((s) => !s.finished)) throw fail('export_busy', 'يوجد تصدير جارٍ بالفعل');

    const project = await deps.projects.load(projectId);
    if (resolve(outputPath) === resolve(project.source.path)) throw fail('output_is_source', 'لا يمكن الكتابة فوق ملف المصدر');

    const sessionId = randomUUID();
    // الصور المرجعية في مكان parity.ts المتفق عليه (يقرأه pnpm acceptance:parity أيضاً)؛ تصدير جديد يمسح السابقة
    const refDir = referenceDir(deps.projects.cacheDir(projectId));
    await rm(refDir, { recursive: true, force: true });
    await mkdir(refDir, { recursive: true });
    const stdin = new PassThrough({ highWaterMark: 8 * 1024 * 1024 });
    const abort = new AbortController();
    const spec = { outputPath, fps, hasAudio: project.source.hasAudio, sourcePath: project.source.path, edl, stdin, signal: abort.signal };
    const muxed = mux(deps.bins(), raw ? { ...spec, raw } : spec);
    muxed.catch(() => undefined); // الفشل يُقرأ في finish/chunk؛ لا رفض غير معالج
    sessions.set(sessionId, {
      projectId,
      outputPath,
      expectedFrames,
      fps,
      hasAudio: project.source.hasAudio,
      control: { sourcePath: project.source.path, clips: project.timeline.clips },
      seed: project.seed,
      stdin,
      mux: muxed,
      abort,
      refDir,
      refCount: 0,
      lastTimestampUs: -1,
      finished: false,
    });
    return { sessionId };
  });

  handle('export:chunk', async (sid, data, isKey, ts) => {
    const s = session(sid);
    const buf = bytesOf(data, 'chunk', MAX_CHUNK);
    if (typeof isKey !== 'boolean') throw new ArgError('وسيط غير صالح: isKey');
    const timestampUs = int(ts, 'timestampUs');
    // ترتيب العرض = ترتيب الفك (بلا B-frames): طابع غير تصاعدي يعني كتلاً خارج الترتيب → ملف فاسد
    if (timestampUs <= s.lastTimestampUs) throw fail('write_failed', `كتلة خارج الترتيب (${timestampUs} ≤ ${s.lastTimestampUs})`);
    s.lastTimestampUs = timestampUs;
    // عند امتلاء الأنبوب ننتظر drain، أو فشل ffmpeg (وعد mux نفسه؛ له catch من start فلا رفض غير معالج)
    if (!s.stdin.write(buf)) await Promise.race([once(s.stdin, 'drain'), s.mux]);
  });

  handle('export:referenceFrame', async (sid, i, png) => {
    const s = session(sid);
    const index = int(i, 'index');
    if (index >= s.expectedFrames) throw new ArgError('فهرس خارج المدى');
    const buf = bytesOf(png, 'png', MAX_PNG);
    if (PNG_MAGIC.some((b, k) => buf[k] !== b)) throw new ArgError('ليس ملف PNG');
    if (s.refCount >= MAX_REFS) throw new ArgError('تجاوز عدد الصور المرجعية');
    s.refCount++;
    await writeFile(join(s.refDir, referencePngName(index)), buf);
  });

  handle('export:finish', async (sid): Promise<ExportFinishResult> => {
    const s = session(sid);
    s.finished = true;
    s.stdin.end();
    try {
      await s.mux;
    } catch (e) {
      sessions.delete(id(sid, 'sessionId'));
      await rm(s.refDir, { recursive: true, force: true }).catch(() => undefined);
      if (e instanceof FfmpegError && e.code === 'aborted') throw fail('aborted', 'أُلغي التصدير');
      throw fail('write_failed', `فشل دمج الملف: ${e instanceof FfmpegError ? (e.stderr?.trim().split('\n').at(-1) ?? e.message) : String(e)}`);
    }
    sessions.delete(id(sid, 'sessionId'));

    // FR-014: فحص التطابق بعد كل تصدير — العدّ ومدة الصوت وPSNR/SSIM مع ±1 عند الصور المرجعية (T042)
    const reportDir = join(deps.projects.cacheDir(s.projectId), 'parity');
    await rm(reportDir, { recursive: true, force: true });
    const report = await checkParity(deps.bins(), {
      exportPath: s.outputPath,
      expectedFrames: s.expectedFrames,
      fps: s.fps,
      referencePngs: await listReferencePngs(s.refDir),
      outDir: reportDir,
      seed: s.seed,
      expectAudio: s.hasAudio,
      control: s.control,
    });
    return {
      path: s.outputPath,
      frames: report.frames.counted,
      durationUs: report.audio.videoDurationUs,
      bytes: (await stat(s.outputPath)).size,
      referenceDir: s.refDir,
      parityCheck: {
        status: report.ok ? 'ok' : 'failed',
        frames: { expected: report.frames.expected, actual: report.frames.counted, ok: report.frames.ok },
        audio: report.audio.audioDurationUs === null ? null : { durationUs: report.audio.audioDurationUs, ok: report.audio.ok },
        psnrMedian: report.psnrMedian,
        ssimMedian: report.ssimMedian,
        thresholds: report.thresholds,
        failures: report.failures,
        reportDir,
      },
    };
  });

  handle('export:cancel', async (sid) => {
    const sessionId = id(sid, 'sessionId');
    const s = sessions.get(sessionId);
    if (!s) return;
    s.finished = true;
    s.abort.abort(); // runFfmpeg يقتل ffmpeg ويحذف الملف الناقص (FR-014)
    await discard(sessionId, s);
  });
}
