import type { ProjectDocument, Proposal, Reason, StyleVersion, Transcript } from '../contracts/types';
import { CommandError } from '../commands/types';

export type Word = Transcript['words'][number];
export type ProposalItem = Proposal['items'][number];

/** بند قبل إسناد المعرّف والحالة */
export interface Candidate {
  startUs: number;
  endUs: number;
  text: string;
  reason: Reason;
  ruleId: string;
}

/** جملة (segment) بكلماتها ورموزها المطبَّعة */
export interface Sentence {
  startUs: number;
  endUs: number;
  words: Word[];
  tokens: string[];
  text: string;
}

export interface CutRules {
  silenceMaxUs: number;
  repeatsEnabled: boolean;
  repeatsSimilarity: number;
  minClipUs: number;
  protectSentenceEdgesUs: number;
  fillerWords: string[];
  repeatedRejectionThreshold: number;
  /** cut.minClipUs بوضع mandatory → البند المخالف يُحظر (FR-009)؛ preference → لا حظر */
  minClipMandatory: boolean;
}

function ruleValue<T>(style: StyleVersion, key: keyof StyleVersion['cut'], ok: (v: unknown) => v is T): T {
  const v = style.cut[key].value;
  if (!ok(v)) throw new CommandError('invalid_style_rule', `قيمة القاعدة cut.${key} في النمط غير صالحة`);
  return v;
}
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

/** قيم قواعد القص من النمط المثبّت (القيم في المخطط `unknown` فتُضيَّق هنا مرة واحدة). */
export function readCutRules(style: StyleVersion): CutRules {
  return {
    silenceMaxUs: ruleValue(style, 'silenceMaxUs', isNumber),
    repeatsEnabled: ruleValue(style, 'repeatsEnabled', isBoolean),
    repeatsSimilarity: ruleValue(style, 'repeatsSimilarity', isNumber),
    minClipUs: ruleValue(style, 'minClipUs', isNumber),
    protectSentenceEdgesUs: ruleValue(style, 'protectSentenceEdgesUs', isNumber),
    fillerWords: ruleValue(style, 'fillerWords', isStringArray),
    repeatedRejectionThreshold: ruleValue(style, 'repeatedRejectionThreshold', isNumber),
    minClipMandatory: style.cut.minClipUs.mode === 'mandatory',
  };
}

/** هل تقع كلمة منطوقة داخل [startUs, endUs)؟ */
export function hasSpeech(words: readonly Word[], startUs: number, endUs: number): boolean {
  return words.some((w) => w.startUs < endUs && w.endUs > startUs);
}

/** المقترح المطلوب وهو ما زال قابلاً للمراجعة (draft | reviewed)، وإلا خطأ بكود ثابت. */
export function findOpenProposal(project: ProjectDocument, proposalId: string): { index: number; proposal: Proposal } {
  const index = project.proposals.findIndex((p) => p.id === proposalId);
  if (index < 0) throw new CommandError('proposal_not_found', `المقترح ${proposalId} غير موجود`);
  const proposal = project.proposals[index]!;
  if (proposal.state !== 'draft' && proposal.state !== 'reviewed') {
    throw new CommandError('proposal_not_reviewed', `المقترح في حالة ${proposal.state} ولا يقبل هذا الإجراء`);
  }
  return { index, proposal };
}
