import { CommandError } from '../commands/types';
import type { Rule, StyleVersion } from '../contracts/types';

// قواعد النمط (T072): قراءة قاعدة بمسارها ووضعها. تقييم المخالفة نفسه موجود في مكانه ولا يُكرَّر هنا:
// بنود المقترح في proposal/generate.ts (blocked + blockedBy) وتحذيرات اللقطة في timeline/warnings.ts.
export { clipWarnings, MIN_CLIP_RULE } from '../timeline/warnings';
export { readCutRules } from '../proposal/types';

export type StyleSection = 'cut' | 'captions';

/** `cut.x` / `captions.x` → القسم والحقل؛ الحقل يجب أن يكون خاصية مملوكة في النمط (لا constructor ولا __proto__). */
export function resolvePath(style: StyleVersion, path: string): { section: StyleSection; field: string } {
  const [section, field, ...rest] = path.split('.');
  if ((section === 'cut' || section === 'captions') && field && rest.length === 0 && Object.hasOwn(style[section], field)) {
    return { section, field };
  }
  throw new CommandError('unknown_style_field', `الحقل «${path}» غير موجود في النمط`);
}

export function getRule(style: StyleVersion, path: string): Rule {
  const { section, field } = resolvePath(style, path);
  return (style[section] as Record<string, Rule>)[field]!;
}

export function ruleMode(style: StyleVersion, path: string): Rule['mode'] {
  return getRule(style, path).mode;
}

export function isMandatory(style: StyleVersion, path: string): boolean {
  return ruleMode(style, path) === 'mandatory';
}
