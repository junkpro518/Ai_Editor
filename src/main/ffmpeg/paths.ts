import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface FfmpegBins {
  ffmpeg: string;
  ffprobe: string;
}

const exe = process.platform === 'win32' ? '.exe' : '';

function binsIn(dir: string): FfmpegBins | null {
  const bins = { ffmpeg: join(dir, `ffmpeg${exe}`), ffprobe: join(dir, `ffprobe${exe}`) };
  return existsSync(bins.ffmpeg) && existsSync(bins.ffprobe) ? bins : null;
}

function missing(tried: string[]): Error & { code: 'ffmpeg_missing' } {
  return Object.assign(new Error(`لم نجد ffmpeg/ffprobe. بحثنا في: ${tried.join(', ')}`), {
    code: 'ffmpeg_missing' as const,
  });
}

// الترتيب: FFMPEG_DIR (قاطع إن ضُبط) → opts.resourcesDir/<platform>-<arch> → <repo>/resources/ffmpeg/<platform>-<arch> (تطوير) → process.resourcesPath/ffmpeg (حزمة)
export function resolveFfmpeg(opts?: { resourcesDir?: string }): FfmpegBins {
  const envDir = process.env['FFMPEG_DIR'];
  if (envDir) {
    const bins = binsIn(envDir);
    if (!bins) throw missing([envDir]);
    return bins;
  }

  const sub = `${process.platform}-${process.arch}`;
  const candidates: string[] = [];
  if (opts?.resourcesDir) candidates.push(join(opts.resourcesDir, sub));
  else {
    candidates.push(fileURLToPath(new URL(`../../../resources/ffmpeg/${sub}`, import.meta.url)));
    const packaged = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
    if (packaged) candidates.push(join(packaged, 'ffmpeg'));
  }

  for (const dir of candidates) {
    const bins = binsIn(dir);
    if (bins) return bins;
  }
  throw missing(candidates);
}
