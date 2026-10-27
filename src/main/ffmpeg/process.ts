import { spawn } from 'node:child_process';
import { unlink } from 'node:fs/promises';

export interface Progress {
  outTimeUs: number;
  frame?: number;
  fps?: number;
  speed?: string;
}

export interface RunOptions {
  onProgress?: (p: Progress) => void;
  signal?: AbortSignal;
  timeoutMs?: number;
  stdin?: NodeJS.ReadableStream;
  /** يُحذف عند الإلغاء أو المهلة أو الفشل */
  outputPath?: string;
}

export class FfmpegError extends Error {
  code: 'aborted' | 'timeout' | 'exit' | 'spawn';
  exitCode?: number;
  stderr?: string;
  constructor(code: FfmpegError['code'], message: string, extra?: { exitCode?: number; stderr?: string }) {
    super(message);
    this.name = 'FfmpegError';
    this.code = code;
    if (extra?.exitCode !== undefined) this.exitCode = extra.exitCode;
    if (extra?.stderr !== undefined) this.stderr = extra.stderr;
  }
}

const STDERR_CAP = 64 * 1024;

// يحوّل كتل key=value من -progress pipe:1 إلى أحداث؛ الكتلة تنتهي بسطر progress=
function parseProgress(onBlock: (p: Progress) => void): (chunk: string) => void {
  let buf = '';
  let block: Record<string, string> = {};
  return (chunk) => {
    buf += chunk;
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key !== 'progress') {
        block[key] = val;
        continue;
      }
      const outTimeUs = Number(block['out_time_us']);
      if (Number.isFinite(outTimeUs)) {
        const p: Progress = { outTimeUs };
        const frame = Number(block['frame']);
        const fps = Number(block['fps']);
        if (Number.isFinite(frame)) p.frame = frame;
        if (Number.isFinite(fps)) p.fps = fps;
        if (block['speed']) p.speed = block['speed'];
        onBlock(p);
      }
      block = {};
    }
  };
}

const COMMON_ARGS = ['-nostdin', '-hide_banner', '-loglevel', 'error'];

export function runFfmpeg(bin: string, args: string[], opts: RunOptions = {}): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new FfmpegError('aborted', 'أُلغيت العملية قبل بدئها'));
      return;
    }
    // لا shell أبداً: الوسائط مصفوفة تمرّ حرفياً
    const proc = spawn(bin, [...COMMON_ARGS, '-progress', 'pipe:1', '-y', ...args], {
      windowsHide: true,
      stdio: [opts.stdin ? 'pipe' : 'ignore', 'pipe', 'pipe'] as const,
    });
    const { stdout, stderr: stderrStream } = proc as typeof proc & { stdout: NonNullable<typeof proc.stdout>; stderr: NonNullable<typeof proc.stderr> };

    let stderr = '';
    let settled = false;
    let fatal: FfmpegError | null = null;
    let timer: NodeJS.Timeout | undefined;

    const kill = (err: FfmpegError): void => {
      if (fatal) return;
      fatal = err;
      proc.kill('SIGKILL');
    };
    const onAbort = (): void => kill(new FfmpegError('aborted', 'أُلغيت العملية'));
    opts.signal?.addEventListener('abort', onAbort, { once: true });
    if (opts.timeoutMs) {
      timer = setTimeout(() => kill(new FfmpegError('timeout', `تجاوزت العملية المهلة (${opts.timeoutMs} ms)`)), opts.timeoutMs);
    }

    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
      fn();
    };
    const failAndClean = (err: FfmpegError): void => {
      const done = (): void => finish(() => reject(err));
      if (opts.outputPath) unlink(opts.outputPath).then(done, done);
      else done();
    };

    if (opts.stdin && proc.stdin) {
      // EPIPE عند الإلغاء متوقع؛ الخطأ الحقيقي يأتي من close
      proc.stdin.on('error', () => {});
      opts.stdin.pipe(proc.stdin);
    }
    stdout.setEncoding('utf8');
    stdout.on('data', parseProgress((p) => opts.onProgress?.(p)));
    stderrStream.setEncoding('utf8');
    stderrStream.on('data', (chunk: string) => {
      if (stderr.length < STDERR_CAP) stderr += chunk.slice(0, STDERR_CAP - stderr.length);
    });

    proc.on('error', (e) => failAndClean(new FfmpegError('spawn', `تعذّر تشغيل ffmpeg: ${e.message}`)));
    proc.on('close', (code) => {
      if (fatal) {
        fatal.stderr = stderr;
        failAndClean(fatal);
      } else if (code === 0) {
        finish(() => resolve({ code: 0, stderr }));
      } else {
        failAndClean(
          new FfmpegError('exit', `خرج ffmpeg بالرمز ${code ?? 'null'}`, { exitCode: code ?? -1, stderr }),
        );
      }
    });
  });
}

export function runFfprobe(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, ['-hide_banner', '-loglevel', 'error', ...args], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (c: string) => (stdout += c));
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (c: string) => {
      if (stderr.length < STDERR_CAP) stderr += c.slice(0, STDERR_CAP - stderr.length);
    });
    proc.on('error', (e) => reject(new FfmpegError('spawn', `تعذّر تشغيل ffprobe: ${e.message}`)));
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new FfmpegError('exit', `خرج ffprobe بالرمز ${code ?? 'null'}`, { exitCode: code ?? -1, stderr }));
    });
  });
}
