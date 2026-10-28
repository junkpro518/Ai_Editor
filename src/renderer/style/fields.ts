import { BUNDLED_FONT_FAMILIES } from '../../core/captions/layout';
import type { StyleVersion } from '../../core/contracts/types';
import { formatNumber, t } from '../i18n';

// تعريف حقول النمط للواجهة (T075/T076): المسار كما في style.setField، ونوع المحرّر، ووحدة العرض البشرية
// (µs ↔ ms، نسبة 0..1 ↔ %). مشترك بين لوحة النمط واقتراح التحديث وشارة «محظور» حتى تتطابق التسميات.

export type FieldKind =
  | 'duration' // µs مخزَّنة، ms في الواجهة
  | 'integer'
  | 'ratio' // 0..1 مخزَّنة، % في الواجهة
  | 'percent' // % مخزَّنة
  | 'boolean'
  | 'words'
  | 'font'
  | 'color'
  | 'position'
  | 'minmax';

export type Section = 'cut' | 'captions';
type CutField = keyof StyleVersion['cut'];
type CaptionField = keyof StyleVersion['captions'];
export type FieldPath = `cut.${CutField}` | `captions.${CaptionField}`;
export type FieldLabelKey = `style.field.${FieldPath}`;

export interface FieldDef {
  path: FieldPath;
  section: Section;
  field: CutField | CaptionField;
  kind: FieldKind;
}

const def = (section: Section, field: CutField | CaptionField, kind: FieldKind): FieldDef => ({ path: `${section}.${field}` as FieldPath, section, field, kind });

/** الحقول بترتيب العرض (منزلقات ريلز 17 أولاً: أقل صمت يُحذف، احتفظ قبل/بعد الكلام) */
export const FIELDS: readonly FieldDef[] = [
  def('cut', 'silenceMaxUs', 'duration'),
  def('cut', 'protectSentenceEdgesUs', 'duration'),
  def('cut', 'repeatsEnabled', 'boolean'),
  def('cut', 'repeatsSimilarity', 'ratio'),
  def('cut', 'minClipUs', 'duration'),
  def('cut', 'fillerWords', 'words'),
  def('cut', 'repeatedRejectionThreshold', 'integer'),
  def('captions', 'enabled', 'boolean'),
  def('captions', 'fontFamily', 'font'),
  def('captions', 'fontSizePx', 'integer'),
  def('captions', 'position', 'position'),
  def('captions', 'maxLines', 'integer'),
  def('captions', 'wordsPerChunk', 'minmax'),
  def('captions', 'breakAtPauseUs', 'duration'),
  def('captions', 'highlightCurrent', 'boolean'),
  def('captions', 'textColor', 'color'),
  def('captions', 'highlightColor', 'color'),
  def('captions', 'bgColor', 'color'),
  def('captions', 'safeAreaPct', 'percent'),
  def('captions', 'flagLowConfidence', 'boolean'),
];

export const FONT_FAMILIES = BUNDLED_FONT_FAMILIES;
export const POSITIONS = ['bottom', 'center', 'top'] as const;

export function fieldDef(path: string): FieldDef | undefined {
  return FIELDS.find((f) => f.path === path);
}

/** التسمية العامية للحقل؛ مسار غير معروف يُعرض كما هو */
export function fieldLabel(path: string): string {
  return fieldDef(path) ? t(`style.field.${path}` as FieldLabelKey) : path;
}

const isMinMax = (v: unknown): v is { min: number; max: number } =>
  typeof v === 'object' && v !== null && typeof (v as { min?: unknown }).min === 'number' && typeof (v as { max?: unknown }).max === 'number';

/** قيمة الحقل بوحدة بشرية (للفرق في اقتراح التحديث وشارات الواجهة) */
export function formatValue(def: FieldDef | undefined, value: unknown): string {
  if (!def) return JSON.stringify(value) ?? '';
  switch (def.kind) {
    case 'duration':
      return typeof value === 'number' ? `${formatNumber(value / 1000)} ms` : String(value);
    case 'ratio':
      return typeof value === 'number' ? `${formatNumber(Math.round(value * 100))}%` : String(value);
    case 'percent':
      return typeof value === 'number' ? `${formatNumber(value)}%` : String(value);
    case 'integer':
      return typeof value === 'number' ? (def.field === 'fontSizePx' ? `${formatNumber(value)}px` : formatNumber(value)) : String(value);
    case 'boolean':
      return value ? t('yes') : t('no');
    case 'words':
      return Array.isArray(value) ? value.map(String).join('، ') : String(value);
    case 'position':
      return typeof value === 'string' && (POSITIONS as readonly string[]).includes(value) ? t(`captions.position.${value as (typeof POSITIONS)[number]}`) : String(value);
    case 'minmax':
      return isMinMax(value) ? `${formatNumber(value.min)}–${formatNumber(value.max)}` : JSON.stringify(value);
    case 'font':
    case 'color':
      return String(value);
  }
}
