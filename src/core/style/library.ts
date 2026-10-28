import { readCaptionRules } from '../captions/layout';
import { CommandError } from '../commands/types';
import type { Precedent, Rule, Source, StyleVersion } from '../contracts/types';
import { validateStyle } from '../contracts/validate';
import { readCutRules } from '../proposal/types';
import { resolvePath } from './rules';

// مكتبة النمط (T072، data-model §1.7/§1.9): الإصدار ملف لا يُعدَّل في مكانه؛ كل تغيير إصدار جديد بتاريخ وسبب ونسب.
// الكتابة الفعلية (styles/<id>/v<n>.json) في main عبر أثر style-version-created؛ هنا البناء النقي فقط.

export interface VersionPatch {
  cut?: Partial<StyleVersion['cut']>;
  captions?: Partial<StyleVersion['captions']>;
  /** سوابق تُلحق في الآخر (المعرّفات لا يُعاد ترقيمها) */
  precedents?: Precedent[];
}

export interface VersionMeta {
  reason: string;
  now: string;
  basedOnCorrections?: string[];
  /**
   * أحدث رقم في المكتبة إن كان أعلى من المثبّت (مشروع مثبّت على إصدار قديم، أو تراجع عن إنشاء إصدار — الملف يبقى):
   * الرقم الجديد بعد الأحدث حتى لا يصطدم الحفظ بـ version_exists.
   */
  latestVersion?: number;
}

export function nextVersionNumber(base: StyleVersion, latestVersion?: number): number {
  return Math.max(base.version, latestVersion ?? 0) + 1;
}

/** إصدار جديد من أساس + رقعة؛ يتحقق من المخطط قبل الإرجاع (لا إصدار نصف صالح). */
export function createVersion(base: StyleVersion, patch: VersionPatch, meta: VersionMeta): StyleVersion {
  const { basedOnCorrections: _drop, ...rest } = base;
  const next: StyleVersion = {
    ...rest,
    version: nextVersionNumber(base, meta.latestVersion),
    date: meta.now,
    reason: meta.reason,
    basedOn: { styleId: base.styleId, version: base.version },
    ...(meta.basedOnCorrections ? { basedOnCorrections: meta.basedOnCorrections } : {}),
    cut: { ...base.cut, ...patch.cut },
    captions: { ...base.captions, ...patch.captions },
    precedents: [...base.precedents, ...(patch.precedents ?? [])],
  };
  validateStyle(next);
  return next;
}

const isBoolean = (v: unknown): boolean => typeof v === 'boolean';

/**
 * يبدّل قاعدة واحدة بمسارها (cut.x / captions.x) ويعيد نسخة بالرقم نفسه؛ النوع يُفحص بقراءة القواعد كما يقرأها
 * المولّد والكابشن (readCutRules/readCaptionRules) فلا يُحفظ إصدار يُفشل أمراً لاحقاً. الوضع يبقى إن لم يُحدَّد.
 */
export function applyField(style: StyleVersion, path: string, value: unknown, mode: Rule['mode'] | undefined, source: Source): StyleVersion {
  const { section, field } = resolvePath(style, path);
  const current = (style[section] as Record<string, Rule>)[field]!;
  const rule: Rule = { ...current, value, mode: mode ?? current.mode, source };
  const candidate: StyleVersion = { ...style, [section]: { ...style[section], [field]: rule } };
  const bad = (): never => {
    throw new CommandError('invalid_style_rule', `قيمة الحقل «${path}» غير صالحة`);
  };
  if (section === 'cut') {
    const rules = readCutRules(candidate);
    // المخطط يصفها عدداً صحيحاً ≥ 2؛ عتبة 1 أو 0 تجعل كل تطبيق اقتراحَ تحديث
    if (!Number.isInteger(rules.repeatedRejectionThreshold) || rules.repeatedRejectionThreshold < 2) bad();
  } else {
    readCaptionRules(candidate);
    if (!isBoolean(candidate.captions.flagLowConfidence.value)) bad(); // لا يقرأه readCaptionRules
  }
  return candidate;
}

/** إصدار جديد بمحتوى إصدار قديم (الرجوع لا يحذف التاريخ): الرقم بعد الحالي، السبب rollback to v<n>، النسب إلى الهدف. */
export function rollbackContent(target: StyleVersion, currentVersion: number, now: string): StyleVersion {
  const { basedOnCorrections: _drop, ...rest } = target;
  const next: StyleVersion = {
    ...rest,
    version: currentVersion + 1,
    date: now,
    reason: `rollback to v${target.version}`,
    basedOn: { styleId: target.styleId, version: target.version },
  };
  validateStyle(next);
  return next;
}
