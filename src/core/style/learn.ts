import { CommandError } from '../commands/types';
import type { Correction, Precedent, ProjectDocument, Reason, StyleUpdateProposal, StyleVersion } from '../contracts/types';
import { readCutRules } from '../proposal/types';
import { normalizeArabic, tokenize } from '../transcript/normalize';

// التعلّم من التصحيحات (T073، FR-011، الدستور II): استثناءات exclude_item بالسبب نفسه عبر المشروع كله
// (الأقل من العتبة تُحتسب في المقترحات التالية — FR-011)، ناقص ما دخل في اقتراح تحديث سابق غير ملغى
// (superseded لا يستهلك تصحيحاته فتُعدّ من جديد — القرار 32).
// الناتج اقتراح pending لا يغيّر النمط إلا بقبول صريح (SC-007)؛ القبول في style.updateProposal.accept.

export interface LearnContext {
  now: () => string;
  newId: () => string;
}

type Diff = StyleUpdateProposal['diff'][number];

/** هامش فوق أطول صمت مستثنى حتى لا يُقترح حذفه مرة أخرى */
const SILENCE_MARGIN_US = 100_000;
const SIMILARITY_STEP = 0.05;
const SIMILARITY_MAX = 0.99;
/**
 * سقف اقتباس السابقة (مراجعة US3): اقتباس repeat/abandoned جملة كاملة من نص المزود (حتى 100k كلمة × 256 حرفاً
 * بلا ترقيم) يُنسخ في كل إصدار نمط لاحق؛ = maxLength في style.schema.json. التصحيح في المشروع يبقى كاملاً.
 */
export const MAX_PRECEDENT_QUOTE = 2000;

const clip = (quote: string): string => (quote.length > MAX_PRECEDENT_QUOTE ? `${quote.slice(0, MAX_PRECEDENT_QUOTE - 1)}…` : quote);

/** مدة البند المستثنى (µs) من المقترح الذي يحمله؛ 0 إن لم يُعثر عليه */
function itemDurationUs(project: ProjectDocument, c: Correction): number {
  const item = project.proposals.find((p) => p.id === c.proposalId)?.items.find((i) => i.id === c.itemId);
  return item ? item.endUs - item.startUs : 0;
}

/** القاعدة الملموسة لكل سبب (قواعد بسيطة بلا نموذج لغوي — القرار 17) */
function diffFor(reason: Reason, style: StyleVersion, project: ProjectDocument, group: Correction[]): Diff[] {
  const rules = readCutRules(style);
  switch (reason) {
    case 'silence': {
      // البند = الفجوة ناقص هامشي الحماية؛ العتبة تُقارَن بالفجوة نفسها فتُعاد إضافة الهامشين
      const longest = Math.max(...group.map((c) => itemDurationUs(project, c)));
      const to = longest + 2 * rules.protectSentenceEdgesUs + SILENCE_MARGIN_US;
      return to > rules.silenceMaxUs ? [{ path: 'cut.silenceMaxUs', from: rules.silenceMaxUs, to }] : [];
    }
    case 'filler': {
      const kept = new Set(group.flatMap((c) => tokenize(normalizeArabic(c.quote))));
      const to = rules.fillerWords.filter((w) => !kept.has(normalizeArabic(w)));
      return to.length < rules.fillerWords.length ? [{ path: 'cut.fillerWords', from: rules.fillerWords, to }] : [];
    }
    case 'repeat': {
      const to = Math.min(SIMILARITY_MAX, Math.round((rules.repeatsSimilarity + SIMILARITY_STEP) * 100) / 100);
      return to > rules.repeatsSimilarity ? [{ path: 'cut.repeatsSimilarity', from: rules.repeatsSimilarity, to }] : [];
    }
    case 'abandoned':
      return []; // لا قاعدة مخصصة في 001؛ السوابق وحدها
  }
}

const seconds = (us: number): string => (us / 1_000_000).toFixed(1);

/** القاعدة كسابقة (video-shotcraft، _batch12): جملة قاعدة + اقتباس التصحيح حرفياً + سؤال فحص ذاتي */
function sentences(reason: Reason, quote: string, diff: Diff[], style: StyleVersion): { rule: string; check: string } {
  const rules = readCutRules(style);
  switch (reason) {
    case 'silence': {
      const to = diff[0]?.to;
      const limit = seconds(typeof to === 'number' ? to : rules.silenceMaxUs);
      return {
        rule: `لا تحذف صمتاً أقصر من ${limit} ثانية؛ المستخدم أبقى صمتاً بهذا الطول (${quote}).`,
        check: `هل الصمت المقترح حذفه أطول من ${limit} ثانية فعلاً؟`,
      };
    }
    case 'filler':
      return {
        rule: `لا تعتبر «${quote}» حشواً؛ المستخدم أبقاها في كلامه.`,
        check: `هل الكلمة المقترح حذفها حشو فعلاً عند هذا المتحدث أم جزء من كلامه؟`,
      };
    case 'repeat': {
      const to = diff[0]?.to;
      const pct = Math.round((typeof to === 'number' ? to : rules.repeatsSimilarity) * 100);
      return {
        rule: `لا تحذف جملة كإعادة إلا إذا تشابهت مع التالية بنسبة ${pct}٪ فأكثر؛ المستخدم أبقى «${quote}».`,
        check: `هل الجملتان إعادة حقيقية أم توضيح مقصود؟`,
      };
    }
    case 'abandoned':
      return {
        rule: `لا تحذف «${quote}» كجملة متروكة؛ المستخدم أبقاها.`,
        check: `هل الجملة القصيرة متروكة فعلاً أم مقدمة مقصودة لما بعدها؟`,
      };
  }
}

/**
 * يبني اقتراح تحديث النمط من استثناءات المستخدم أو يعيد null إن لم يبلغ أي سبب العتبة
 * (cut.repeatedRejectionThreshold). عند عدة أسباب فوق العتبة يُختار الأكبر عدداً (التعادل → الأسبق في التصحيحات).
 */
export function buildStyleUpdateProposal(project: ProjectDocument, style: StyleVersion, ctx: LearnContext): StyleUpdateProposal | null {
  const threshold = readCutRules(style).repeatedRejectionThreshold;
  const consumed = new Set(project.styleUpdateProposals.filter((s) => s.state !== 'superseded').flatMap((s) => s.trigger.correctionIds));
  const groups = new Map<Reason, Correction[]>();
  for (const c of project.corrections) {
    if (c.kind !== 'exclude_item' || !c.reason || consumed.has(c.id)) continue;
    groups.set(c.reason, [...(groups.get(c.reason) ?? []), c]);
  }
  let best: [Reason, Correction[]] | null = null;
  for (const entry of groups) {
    if (entry[1].length >= threshold && (!best || entry[1].length > best[1].length)) best = entry;
  }
  if (!best) return null;

  const [reason, group] = best;
  const diff = diffFor(reason, style, project, group);
  const id = ctx.newId();
  const at = ctx.now();
  const newPrecedents: Precedent[] = group.map((c) => ({
    id: ctx.newId(),
    ruleId: c.ruleId ?? (diff[0]?.path ?? `cut.${reason}`),
    ...sentences(reason, clip(c.quote), diff, style),
    quote: clip(c.quote),
    source: { kind: 'learned', ref: c.id, at },
    // رقم تقريبي؛ accept يعيد ختمه برقم الإصدار الفعلي (المكتبة قد تكون أحدث من المثبّت)
    addedInVersion: style.version + 1,
  }));
  return {
    id,
    createdAt: at,
    styleRef: { ...project.style },
    trigger: { kind: 'repeated_rejection', reason, count: group.length, correctionIds: group.map((c) => c.id) },
    diff,
    newPrecedents,
    state: 'pending',
  };
}

/**
 * القرار 32: تغيّر تثبيت النمط (setField/rollback/upgradeStyle/قبول اقتراح آخر) يلغي الاقتراحات المعلّقة — بُنيت على
 * قواعد لم تعد المثبّتة. superseded بتاريخ؛ التراجع عن الأمر يعيدها pending (لقطة كاملة).
 */
export function supersedePending(proposals: readonly StyleUpdateProposal[], at: string, exceptId?: string): StyleUpdateProposal[] {
  return proposals.map((p) => (p.state === 'pending' && p.id !== exceptId ? { ...p, state: 'superseded', decidedAt: at } : p));
}

/** اقتراح التحديث المطلوب وهو ما زال pending، وإلا خطأ بكود ثابت (accept/reject). */
export function findPendingStyleUpdate(project: ProjectDocument, proposalId: string): { index: number; proposal: StyleUpdateProposal } {
  const index = project.styleUpdateProposals.findIndex((p) => p.id === proposalId);
  if (index < 0) throw new CommandError('proposal_not_found', `اقتراح تحديث النمط ${proposalId} غير موجود`);
  const proposal = project.styleUpdateProposals[index]!;
  if (proposal.state !== 'pending') throw new CommandError('proposal_not_pending', `اقتراح تحديث النمط في حالة ${proposal.state} ولا يقبل هذا الإجراء`);
  return { index, proposal };
}
