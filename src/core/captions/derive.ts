import type { CommandContext, MeasureFn } from '../commands/types';
import type { ProjectDocument, StyleVersion } from '../contracts/types';
import { usToFrame } from '../time';
import { chunkWords } from './chunking';
import type { Chunk } from './chunking';
import { outputSize } from './compose';
import { fallbackMeasure, layoutChunk, readCaptionRules } from './layout';
import type { CaptionCue, CaptionRules } from './types';

// اشتقاق الكابشن (T055/T060، data-model §1.10): يُحسب داخل الأمر ويُخزَّن؛ الرسم لا يعيد التجميع ولا القياس.
// حبيبة الكابشن = الكلمة النشطة: cue لكل كلمة ظاهرة بمداها الزمني، تحمل أسطر مجموعتها كاملة (حتى لا يرفّ النص بين
// الكلمات) ومعرّفات كلمات المجموعة ومستطيل الكلمة النشطة فقط — فالرسم يعرف الكلمة النشطة من الكابشن وحده.

type Word = NonNullable<ProjectDocument['transcript']>['words'][number];
type Clip = ProjectDocument['timeline']['clips'][number];

/** كلمة مع مدى إطارات المصدر [sF, eF) — إطار واحد على الأقل */
interface Placed {
  word: Word;
  sF: number;
  eF: number;
}

export interface DerivedCues {
  cues: CaptionCue[];
  /** true عندما لم تُحقن دالة قياس (اختبارات الوحدة): المستطيلات تقريبية بالقياس الاحتياطي */
  approximate: boolean;
}

/**
 * التجميع لكل لقطة على حدة (لا مجموعة تعبر حدّ لقطة؛ يصحّ مع إعادة الترتيب)، ثم µs → إطار مصدر → إطار تايم لاين.
 * الكلمة تُنسب للقطة الأكبر تداخلاً معها (التعادل → الأسبق في التايم لاين)؛ كلمة بلا تداخل = مقصوصة وتُحذف؛
 * كلمة مستقيمة على حدّ القص تُقصّ على الجزء الظاهر. حتمي: المعرّف `cue:<wordId>`، بلا ساعة ولا عشوائية.
 */
export function deriveCues(project: ProjectDocument, style: StyleVersion, measure?: MeasureFn): DerivedCues {
  const approximate = measure === undefined;
  const transcript = project.transcript;
  if (!transcript || transcript.words.length === 0) return { cues: [], approximate };
  const rules = readCaptionRules(style);
  const m = measure ?? fallbackMeasure;
  const fps = project.source.fps;
  const out = outputSize({ width: project.source.width, height: project.source.height, rotation: project.source.rotation ?? 0 });
  const clips = project.timeline.clips;

  const perClip: Placed[][] = clips.map(() => []);
  const words = [...transcript.words].sort((a, b) => a.startUs - b.startUs);
  for (const word of words) {
    const sF = usToFrame(word.startUs, fps);
    const eF = Math.max(sF + 1, usToFrame(Math.max(word.startUs, word.endUs), fps));
    let best = -1;
    let bestOverlap = 0;
    clips.forEach((c, i) => {
      const overlap = Math.min(eF, c.outFrame) - Math.max(sF, c.inFrame);
      if (overlap > bestOverlap) {
        best = i;
        bestOverlap = overlap;
      }
    });
    if (best >= 0) perClip[best]!.push({ word, sF, eF });
  }

  const cues: CaptionCue[] = [];
  clips.forEach((clip, ci) => {
    const placed = perClip[ci]!;
    if (!placed.length) return;
    const byId = new Map(placed.map((p) => [p.word.id, p]));
    for (const chunk of chunkWords(placed.map((p) => p.word), rules)) {
      emitChunk(chunk, byId, clip, rules, out, m, fps, cues);
    }
  });
  return { cues, approximate };
}

function toTimeline(clip: Clip, sourceFrame: number): number {
  return clip.timelineStartFrame + Math.min(clip.outFrame, Math.max(clip.inFrame, sourceFrame)) - clip.inFrame;
}

/** يخطّط المجموعة؛ إن لم تتسع حتى بالحد الأدنى قسمها نصفين (حتى كلمة واحدة) — كل نصف بزمنه. */
function emitChunk(
  chunk: Chunk,
  byId: ReadonlyMap<string, Placed>,
  clip: Clip,
  rules: CaptionRules,
  out: { width: number; height: number },
  measure: MeasureFn,
  fps: ProjectDocument['source']['fps'],
  cues: CaptionCue[],
): void {
  const ws = chunk.wordIds.map((id) => byId.get(id)!);
  const layout = layoutChunk(
    ws.map((p) => p.word.text),
    rules,
    out,
    measure,
  );
  if (!layout.fits && ws.length > 1) {
    const half = Math.ceil(ws.length / 2);
    const a = ws.slice(0, half);
    const b = ws.slice(half);
    const gap = b[0]!.word.startUs - a[a.length - 1]!.word.endUs;
    emitChunk({ wordIds: a.map((p) => p.word.id), startUs: chunk.startUs, endUs: gap < rules.breakAtPauseUs ? b[0]!.word.startUs : a[a.length - 1]!.word.endUs }, byId, clip, rules, out, measure, fps, cues);
    emitChunk({ wordIds: b.map((p) => p.word.id), startUs: b[0]!.word.startUs, endUs: chunk.endUs }, byId, clip, rules, out, measure, fps, cues);
    return;
  }
  const last = ws[ws.length - 1]!;
  const chunkEnd = toTimeline(clip, Math.max(last.eF, usToFrame(Math.max(0, chunk.endUs), fps)));
  for (let i = 0; i < ws.length; i++) {
    const p = ws[i]!;
    const next = ws[i + 1];
    const prevEnd = cues.length ? cues[cues.length - 1]!.endFrame : 0;
    const startFrame = Math.max(prevEnd, toTimeline(clip, p.sF));
    const endFrame = next ? toTimeline(clip, next.sF) : chunkEnd;
    // كلمة أقصر من إطار (تبدأ في إطار الكلمة التالية) لا تُنتج كابشن بلا مدة؛ تبقى في أسطر المجموعة
    if (endFrame <= startFrame) continue;
    cues.push({
      id: `cue:${p.word.id}`,
      startFrame,
      endFrame,
      wordIds: chunk.wordIds,
      lines: layout.lines,
      fontSizePx: layout.fontSizePx,
      activeWordRects: [layout.wordRects[i] ?? [0, 0, 0, 0]],
    });
  }
}

/**
 * قاعدة الإبطال: تُستدعى في نهاية كل أمر يغيّر transcript/timeline/style.captions/fps وفي إلحاق التفريغ.
 * الكابشن مطفأ أو بلا تفريغ → cues فارغة (القديمة تُفرَّغ).
 */
export function withCaptions(project: ProjectDocument, ctx: Pick<CommandContext, 'style' | 'measure'>): ProjectDocument {
  if (!project.captions.enabled || !project.transcript) {
    return project.captions.cues.length ? { ...project, captions: { ...project.captions, cues: [] } } : project;
  }
  const { cues } = deriveCues(project, ctx.style, ctx.measure);
  return { ...project, captions: { ...project.captions, cues } };
}
