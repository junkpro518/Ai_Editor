// T031/T034 — مهمة القياس R10: يشغّل التطبيق المبني عبر Playwright ويجري القياسات القابلة للتنفيذ على هذا الجهاز،
// ويكتب كل قياس إلى out/spike/<id>.json ثم ملخّصاً out/spike/summary.json. النتائج تُنقل يدوياً إلى measurements.md.
// التشغيل: pnpm build ثم pnpm spike (على Linux بلا شاشة: xvfb-run -a pnpm spike). التفاصيل في README.md.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release, totalmem } from 'node:os';
import { join } from 'node:path';
import type { ElectronApplication } from '@playwright/test';
import { detectEncoders } from '../../src/main/ffmpeg/encoders';
import { resolveFfmpeg } from '../../src/main/ffmpeg/paths';
import { probe } from '../../src/main/ffmpeg/probe';
import { runFfprobe } from '../../src/main/ffmpeg/process';
import { fixture, launchApp, repo } from '../../tests/e2e/helpers/launch';
import { runExportSpike } from './export-spike';
import { importAndMount, probeDecoders, probeEncoders, renderArabicLine, showFrame } from './probes';

const OUT = join(repo, 'out/spike');
const SOURCE = fixture('synthetic-15min-1080p.mp4');
const DATE = new Date().toISOString();

async function save(id: string, value: unknown): Promise<void> {
  await writeFile(join(OUT, `${id}.json`), JSON.stringify({ id, date: DATE, ...(value as object) }, null, 2));
  console.log(`[spike] ${id} ✓`);
}

interface ProcMetric {
  type: string;
  pid: number;
  rssKb: number;
}
async function metrics(app: ElectronApplication): Promise<{ procs: ProcMetric[]; totalKb: number; rendererKb: number; gpuKb: number }> {
  const procs = await app.evaluate(({ app }) =>
    app.getAppMetrics().map((m) => ({ type: m.type, pid: m.pid, rssKb: m.memory.workingSetSize })),
  );
  const sum = (t?: string): number => procs.filter((p) => !t || p.type === t).reduce((a, p) => a + p.rssKb, 0);
  return { procs, totalKb: sum(), rendererKb: sum('Tab'), gpuKb: sum('GPU') };
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  if (!existsSync(SOURCE)) throw new Error(`العيّنة غائبة: ${SOURCE} — شغّل pnpm fixtures:generate`);
  const bins = resolveFfmpeg();
  const summary: Record<string, unknown> = {};

  // ---- S2: الإقلاع البارد (من _electron.launch إلى domcontentloaded) + الذاكرة وقت الخمول ----
  const t0 = performance.now();
  const { app, page, userData } = await launchApp();
  const launchMs = performance.now() - t0;
  try {
    const versions = await app.evaluate(({ app }) => ({
      versions: process.versions,
      gpu: app.getGPUFeatureStatus(),
      platform: process.platform,
      arch: process.arch,
    }));
    const machine = {
      os: `${platform()} ${release()}`,
      cpu: cpus()[0]?.model ?? 'unknown',
      cores: cpus().length,
      ramGb: Math.round(totalmem() / 1024 ** 3),
      devDri: existsSync('/dev/dri'),
      display: process.env['DISPLAY'] ?? null,
      electron: versions.versions['electron'],
      chrome: versions.versions['chrome'],
      node: versions.versions['node'],
      gpuFeatureStatus: versions.gpu,
      ffmpegVersion: /ffmpeg version (\S+)/.exec(await runFfprobe(bins.ffmpeg, ['-version']))?.[1] ?? 'unknown',
      ffmpegDir: bins.ffmpeg,
    };
    await save('machine', machine);
    summary['machine'] = machine;

    await new Promise((r) => setTimeout(r, 3000)); // خمول قبل القراءة
    const idle = await metrics(app);
    const s2 = { launchMs, idle, note: 'Linux/xvfb، تطوير (out/ غير مغلّف)، قرص بذاكرة مخبّأة دافئة غالباً' };
    await save('s2', s2);
    summary['s2'] = { launchMs, idleTotalKb: idle.totalKb, idleRendererKb: idle.rendererKb };

    // ---- S4: دعم الفك ----
    const s4 = await page.evaluate(probeDecoders, [
      'avc1.42c00d', 'avc1.64001f', 'avc1.640028',
      'hvc1.1.6.L93.B0', 'hvc1.2.4.L120.B0', 'hev1.2.4.L120.B0',
      'vp09.00.10.08', 'av01.0.04M.08',
    ]);
    await save('s4', { decoders: s4, hdrDrawImage: 'غير قابل للقياس هنا: لا فك HEVC 10-bit على هذا الجهاز (بلا GPU)' });
    summary['s4'] = s4;

    // ---- S5: دعم الترميز ----
    const base: VideoEncoderConfig = { codec: 'avc1.640028', width: 1920, height: 1080, bitrate: 8_000_000, framerate: 30 };
    const s5Configs: VideoEncoderConfig[] = [
      { ...base, hardwareAcceleration: 'prefer-hardware' },
      { ...base, hardwareAcceleration: 'prefer-software' },
      { ...base, hardwareAcceleration: 'no-preference' },
      { ...base, hardwareAcceleration: 'prefer-software', avc: { format: 'annexb' } },
      { ...base, codec: 'avc1.42001f', hardwareAcceleration: 'no-preference', avc: { format: 'annexb' } },
      { ...base, codec: 'vp09.00.10.08', hardwareAcceleration: 'no-preference' },
      { ...base, codec: 'av01.0.04M.08', hardwareAcceleration: 'no-preference' },
    ];
    const s5 = await page.evaluate(probeEncoders, s5Configs);
    await save('s5', { encoders: s5 });
    summary['s5'] = s5.map((e) => ({ codec: e.request.codec, hw: e.request.hardwareAcceleration, annexb: e.request.avc?.format === 'annexb', supported: e.supported }));

    // ---- S11: سطر عربي مختلط على canvas 1080p ----
    const fontPath = join(repo, 'resources/fonts/ibm-plex-sans-arabic/IBMPlexSansArabic-Regular.ttf');
    const s11 = await page.evaluate(renderArabicLine, {
      text: 'السلام عليكم Hello 123 ٤٥٦ لا إله إلا الله',
      fontBase64: (await readFile(fontPath)).toString('base64'),
      family: 'SpikePlexArabic',
      appFamily: 'IBM Plex Sans Arabic',
      sizePx: 78,
      width: 1920,
      height: 1080,
    });
    const { pngDataUrl, ...s11Rest } = s11;
    await writeFile(join(OUT, 's11-arabic.png'), Buffer.from(pngDataUrl.split(',')[1] ?? '', 'base64'));
    await save('s11', { ...s11Rest, png: 's11-arabic.png', font: 'IBMPlexSansArabic-Regular.ttf 78px', direction: 'rtl', textAlign: 'center' });
    summary['s11'] = { pixelHash: s11.pixelHash, width: s11.measured.width, apis: s11.apis };

    // ---- S7 (Linux معلومة فقط): مشفّرات FFmpeg الفعلية ----
    const s7 = await detectEncoders(bins);
    await save('s7-linux', s7);
    summary['s7'] = s7.h264.map((e) => `${e.name}:${e.works ? 'works' : 'fails'}`);

    // ---- S8: زمن -count_frames لـ15 دقيقة (عدّ فقط، ثم probe() كاملاً) ----
    const c0 = performance.now();
    const countJson = await runFfprobe(bins.ffprobe, ['-protocol_whitelist', 'file,pipe', '-print_format', 'json', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', `file:${SOURCE}`]);
    const countMs = performance.now() - c0;
    const p0 = performance.now();
    const probed = await probe(bins, SOURCE);
    const probeMs = performance.now() - p0;
    const s8 = { countFramesMs: countMs, nbReadFrames: Number((JSON.parse(countJson) as { streams?: Array<{ nb_read_frames?: string }> }).streams?.[0]?.nb_read_frames), probeTotalMs: probeMs, probed: { ...probed, path: undefined } };
    await save('s8', s8);
    summary['s8'] = { countFramesMs: countMs, probeTotalMs: probeMs };

    // ---- S3 (جزئي): ذاكرة الواجهة أثناء تقليب 60 إطاراً عبر 15 دقيقة ----
    const mounted = await page.evaluate(importAndMount, { path: SOURCE, width: 1920, height: 1080 });
    if (!mounted.ok) throw new Error(`استيراد العيّنة فشل: ${mounted.code}: ${mounted.message}`);
    const samples: Array<{ frame: number; ms: number; error?: string; rendererKb: number; gpuKb: number; totalKb: number }> = [];
    const last = probed.frameCount - 1;
    for (let k = 0; k < 60; k++) {
      const frame = Math.round((k * last) / 59);
      const r = await page.evaluate(showFrame, { projectId: mounted.projectId, frame });
      const m = await metrics(app);
      const sample: (typeof samples)[number] = { frame, ms: r.ms, rendererKb: m.rendererKb, gpuKb: m.gpuKb, totalKb: m.totalKb };
      if (r.error) sample.error = r.error;
      samples.push(sample);
    }
    const max = (k: 'rendererKb' | 'gpuKb' | 'totalKb'): number => Math.max(...samples.map((s) => s[k]));
    const s3 = {
      label: 'جزئي، Linux، بلا Mac',
      importMs: mounted.importMs,
      firstFrameMs: mounted.firstFrameMs,
      frames: 60,
      maxRendererKb: max('rendererKb'),
      maxGpuKb: max('gpuKb'),
      maxTotalKb: max('totalKb'),
      seekMsMedian: [...samples.map((s) => s.ms)].sort((a, b) => a - b)[30],
      errors: samples.filter((s) => s.error).length,
      samples,
    };
    await save('s3-partial', s3);
    summary['s3'] = { maxRendererKb: s3.maxRendererKb, maxTotalKb: s3.maxTotalKb, seekMsMedian: s3.seekMsMedian, errors: s3.errors };

    // ---- S10 (جزئي) + عتبة PSNR/SSIM الأولية ----
    const s10 = await runExportSpike({ page, bins, projectId: mounted.projectId, sourcePath: SOURCE, fps: probed.fps, from: 0, to: 3600, outDir: OUT });
    await save('s10', s10);
    summary['s10'] = {
      decodeComposeX: s10.decodeCompose.xRealtime,
      pipelineX: s10.pipeline?.xRealtime ?? null,
      encoder: s10.encoder.config?.hardwareAcceleration ?? null,
      counted: s10.mux?.countedFrames ?? null,
      psnrMedian: s10.parity?.psnrMedian ?? null,
      ssimMedian: s10.parity?.ssimMedian ?? null,
      gate: s10.parity?.proposedPsnrGateDb ?? null,
      allAligned: s10.parity?.allAligned ?? null,
      notes: s10.notes,
    };
  } finally {
    await app.close();
  }
  await save('summary', { userData, ...summary });
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
