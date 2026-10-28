import type { CommandName, CommandParamsMap, ProjectDocument, StyleVersion } from '../contracts/types';

/** قياس النص يُحقن من renderer (plan.md §Assumptions) — src/core بلا DOM. */
export type MeasureFn = (
  text: string,
  font: { family: string; sizePx: number; weight?: number },
  dir: 'rtl' | 'ltr',
) => { width: number; height: number; wordRects: Array<[number, number, number, number]> };

/** ناتج ffprobe كما يراه core (بلا id)؛ يُحقن من renderer بعد api.project.probe — core لا يعرف main. */
export type ProbeLike = Omit<ProjectDocument['source'], 'id'>;

export interface CommandContext {
  style: StyleVersion;
  now: () => string;
  newId: () => string;
  measure?: MeasureFn;
  /** مطلوب لـ project.import فقط */
  probe?: ProbeLike;
  /** إصدار الهدف محمَّلاً مسبقاً (style.rollback / project.upgradeStyle) — runtime يحمّله من المكتبة قبل التنفيذ */
  styleVersion?: StyleVersion;
  /** أحدث رقم إصدار في المكتبة لهذا النمط؛ الإصدار الجديد يُرقَّم بعده لا بعد المثبّت (US3) */
  latestStyleVersion?: number;
}

/** أثر جانبي يطلبه الأمر من الطبقة الخارجية؛ الأمر نفسه يبقى نقياً. */
export type Effect =
  | { kind: 'request-transcript'; mode: 'cloud' | 'local' }
  | { kind: 'export-mp4'; outputPath: string }
  | { kind: 'style-version-created'; style: StyleVersion }
  /** proposalId = معرّف project.styleUpdateProposals[] (اقتراح تحديث النمط)، لا معرّف مقترح القص */
  | { kind: 'style-update-proposed'; proposalId: string };

export interface CommandResult {
  project: ProjectDocument;
  description: string;
  warnings?: string[];
  effects?: Effect[];
}

export type CommandImpl<N extends CommandName> = (
  project: ProjectDocument,
  params: CommandParamsMap[N],
  ctx: CommandContext,
) => CommandResult;

export class CommandError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CommandError';
  }
}
