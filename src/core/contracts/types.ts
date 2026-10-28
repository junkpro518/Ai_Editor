/* eslint-disable */
/**
 * مولَّد آلياً من specs/001-proof-of-concept/contracts/*.schema.json — لا تعدّل يدوياً.
 * التجديد: pnpm gen:types
 */
export type Reason = 'silence' | 'repeat' | 'abandoned' | 'filler';

export interface ProjectDocument {
  schemaVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  seed: number;
  source: {
    id: string;
    path: string;
    fileName: string;
    /**
     * sha256(أول 64MB + الحجم)
     */
    hash: string;
    /**
     * ≤ 15 دقيقة (FR-019)
     */
    durationUs: number;
    fps: Rational;
    sourceIsVfr?: boolean;
    /**
     * من ffprobe -count_frames عند الاستيراد (nb_frames غير موثوق)؛ على شبكة fps المشروع
     */
    frameCount: number;
    rotation?: number;
    width: number;
    height: number;
    hasAudio: boolean;
    fileSize?: number;
    mtime?: string;
    container?: string;
    videoCodec?: string;
    audioCodec?: string;
  };
  style: {
    styleId: string;
    version: number;
  };
  transcript: null | Transcript;
  transcriptJob: {
    state: 'idle' | 'extracting_audio' | 'uploading' | 'transcribing' | 'done' | 'failed';
    provider?: string;
    model?: string;
    progress?: number;
    audioHash?: string;
    error?: string;
    startedAt?: string;
    finishedAt?: string;
  };
  timeline: {
    clips: {
      id: string;
      sourceId: string;
      /**
       * رقم إطار صحيح على شبكة fps المشروع
       */
      inFrame: number;
      /**
       * حصري
       */
      outFrame: number;
      timelineStartFrame: number;
      label?: string;
    }[];
  };
  captions: {
    enabled: boolean;
    cues: {
      id: string;
      startFrame: number;
      endFrame: number;
      /**
       * ناتج fit محسوب مرة واحدة
       */
      fontSizePx: number;
      /**
       * مستطيلات الكلمات بالبكسل بدقة المصدر، محسوبة مرة واحدة
       */
      activeWordRects?: [number, number, number, number][];
      wordIds: string[];
      lines: string[];
    }[];
  };
  proposals: Proposal[];
  corrections: Correction[];
  styleUpdateProposals: StyleUpdateProposal[];
}
/**
 * معدل المشروع الثابت (CFR)؛ لمصدر VFR = أقرب معدل معياري لـ avg_frame_rate
 */
export interface Rational {
  num: number;
  den: number;
}
export interface Transcript {
  schemaVersion: 1;
  /**
   * openai | groq | deepgram | elevenlabs | local-whisper ...
   */
  provider: string;
  model: string;
  /**
   * language, mip_opt_out, ... كما أُرسلت
   */
  modelParams: {};
  /**
   * بصمة ملف الصوت المرسَل
   */
  audioSha256: string;
  /**
   * BCP-47، مثل ar
   */
  language: string;
  durationUs: number;
  createdAt: string;
  /**
   * @maxItems 100000
   */
  words: {
    id: string;
    text: string;
    startUs: number;
    endUs: number;
    /**
     * مُطبَّعة 0..1 (ElevenLabs: exp(logprob))؛ null إن المزود لا يعطي ثقة لكل كلمة. علامة «منخفض الثقة» تُحسب عند العرض: confidence < threshold المزود
     */
    confidence: number | null;
    lang?: string;
    /**
     * النص قبل أي تصحيح
     */
    original?: string;
    /**
     * auto محجوزة للتصحيح التلقائي في ميزة لاحقة (القرار 21)؛ لا تُكتب في 001
     */
    correctedBy?: 'user' | 'auto';
  }[];
  segments?: {
    startUs: number;
    endUs: number;
    wordIds: string[];
    text?: string;
  }[];
  /**
   * مسار استجابة المزود الخام داخل مجلد المشروع للمراجعة
   */
  rawRef?: string;
}
export interface Proposal {
  id: string;
  createdAt: string;
  styleRef: {
    styleId: string;
    version: number;
  };
  items: {
    id: string;
    startUs: number;
    endUs: number;
    text: string;
    reason: Reason;
    ruleId: string;
    confidence?: number;
    state: 'proposed' | 'excluded' | 'applied' | 'blocked';
    blockedBy?: string;
  }[];
  totals: {
    byReason: {
      [k: string]: number | undefined;
    };
    savedUs: number;
  };
  state: 'draft' | 'reviewed' | 'applied' | 'discarded';
  /**
   * true إن لم يُستخدم مزود سحابي للتمييز الذكي؛ في 001 الأسباب الأربعة كلها بقواعد محلية فالقيمة true دائماً (FR-003، plan.md §Assumptions)
   */
  localOnly?: boolean;
}
export interface Correction {
  id: string;
  at: string;
  actor: 'user';
  kind: 'exclude_item' | 'exclude_all' | 'manual_edit' | 'word_fix';
  proposalId?: string;
  itemId?: string;
  ruleId?: string;
  reason?: Reason;
  quote: string;
  before?: unknown;
  after?: unknown;
  /**
   * ruleId لقاعدة إلزامية كسرها تعديل يدوي (يُسمح مع تحذير)
   */
  violates?: string;
}
export interface StyleUpdateProposal {
  id: string;
  createdAt: string;
  styleRef: {
    styleId: string;
    version: number;
  };
  trigger: {
    kind: 'repeated_rejection';
    reason?: Reason;
    count?: number;
    correctionIds: string[];
  };
  diff: {
    path: string;
    from: unknown;
    to: unknown;
  }[];
  newPrecedents: {}[];
  state: 'pending' | 'accepted' | 'rejected';
  decidedAt?: string;
}

export interface StyleVersion {
  schemaVersion: 1;
  styleId: string;
  name?: string;
  version: number;
  date: string;
  reason: string;
  basedOn?: StyleRef;
  basedOnCorrections?: string[];
  cut: {
    silenceMaxUs: Rule;
    repeatsEnabled: Rule;
    repeatsSimilarity: Rule;
    minClipUs: Rule;
    protectSentenceEdgesUs: Rule;
    fillerWords: Rule;
    repeatedRejectionThreshold: Rule;
  };
  captions: {
    enabled: Rule;
    fontFamily: Rule;
    fontSizePx: Rule;
    position: Rule;
    maxLines: Rule;
    wordsPerChunk: Rule;
    breakAtPauseUs: Rule;
    highlightCurrent: Rule;
    textColor: Rule;
    highlightColor: Rule;
    bgColor: Rule;
    safeAreaPct: Rule;
    flagLowConfidence: Rule;
  };
  precedents: Precedent[];
  styleGuide: string;
}
export interface StyleRef {
  styleId: string;
  version: number;
}
/**
 * صمت أطول من هذا يُقترح حذفه
 */
export interface Rule {
  value: unknown;
  mode: 'mandatory' | 'preference';
  source: Source;
  note?: string;
}
export interface Source {
  kind: 'default' | 'user' | 'learned' | 'imported';
  /**
   * معرّف التصحيح/المقطع/الدورة الذي أنتج القيمة
   */
  ref?: string;
  at: string;
}
export interface Precedent {
  id: string;
  /**
   * مسار الحقل مثل cut.silenceMaxUs
   */
  ruleId: string;
  /**
   * القاعدة بجملة واحدة
   */
  rule: string;
  /**
   * تصحيح المستخدم حرفياً
   */
  quote: string;
  /**
   * سؤال فحص ذاتي يطرحه الوكيل قبل الاقتراح
   */
  check: string;
  source: Source;
  addedInVersion: number;
}

export type CommandName = 'project.import' | 'transcript.request' | 'proposal.request' | 'proposal.exclude' | 'proposal.apply' | 'proposal.discard' | 'clip.split' | 'clip.trim' | 'clip.move' | 'clip.delete' | 'captions.toggle' | 'transcript.fixWord' | 'style.setField' | 'style.updateProposal.accept' | 'style.updateProposal.reject' | 'project.upgradeStyle' | 'style.rollback' | 'history.undo' | 'history.redo' | 'export.mp4';

export interface CommandParamsMap {
  'project.import': ParamsProjectImport;
  'transcript.request': ParamsTranscriptRequest;
  'proposal.request': ParamsProposalRequest;
  'proposal.exclude': ParamsProposalExclude;
  'proposal.apply': ParamsProposalApply;
  'proposal.discard': ParamsProposalDiscard;
  'clip.split': ParamsClipSplit;
  'clip.trim': ParamsClipTrim;
  'clip.move': ParamsClipMove;
  'clip.delete': ParamsClipDelete;
  'captions.toggle': ParamsCaptionsToggle;
  'transcript.fixWord': ParamsTranscriptFixWord;
  'style.setField': ParamsStyleSetField;
  'style.updateProposal.accept': ParamsStyleUpdateProposalAccept;
  'style.updateProposal.reject': ParamsStyleUpdateProposalReject;
  'project.upgradeStyle': ParamsProjectUpgradeStyle;
  'style.rollback': ParamsStyleRollback;
  'history.undo': ParamsHistoryUndo;
  'history.redo': ParamsHistoryRedo;
  'export.mp4': ParamsExportMp4;
}

export interface ParamsProjectImport {
  path: string;
  styleRef?: StyleRef;
}
export interface ParamsTranscriptRequest {
  mode?: 'cloud' | 'local';
}

export interface ParamsProposalRequest {}

export interface ParamsProposalExclude {
  proposalId: string;
  /**
   * @minItems 1
   */
  itemIds: [string, ...string[]];
}

export interface ParamsProposalApply {
  proposalId: string;
}

export interface ParamsProposalDiscard {
  proposalId: string;
}

export interface ParamsClipSplit {
  clipId: string;
  atFrame: number;
}

export interface ParamsClipTrim {
  clipId: string;
  inFrame?: number;
  outFrame?: number;
}

export interface ParamsClipMove {
  clipId: string;
  toIndex: number;
}

export interface ParamsClipDelete {
  clipId: string;
}

export interface ParamsCaptionsToggle {
  enabled: boolean;
}

export interface ParamsTranscriptFixWord {
  wordId: string;
  text: string;
}

export interface ParamsStyleSetField {
  path: string;
  value: unknown;
  mode?: 'mandatory' | 'preference';
  reason?: string;
}

export interface ParamsStyleUpdateProposalAccept {
  proposalId: string;
}

export interface ParamsStyleUpdateProposalReject {
  proposalId: string;
}

export interface ParamsProjectUpgradeStyle {
  toVersion: number;
}

export interface ParamsStyleRollback {
  styleId: string;
  toVersion: number;
}

export interface ParamsHistoryUndo {}

export interface ParamsHistoryRedo {}

export interface ParamsExportMp4 {
  outputPath: string;
}

/** وصف الأمر في السجل كما هو في المخطط (بيانات، تُقرأ وقت التشغيل من commands.schema.json) */
export interface CommandSpec {
  name: CommandName;
  description?: string;
  undoable: boolean;
  confirm: boolean;
  actors: Array<'user' | 'agent'>;
  params: Record<string, unknown>;
  result?: Record<string, unknown>;
  errors?: string[];
  warnings?: string[];
}
