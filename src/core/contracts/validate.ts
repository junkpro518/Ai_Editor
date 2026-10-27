// التحقق من العقود وقت التشغيل (T018): Ajv 2020 + formats على نسخة المخططات داخل المصدر،
// ثم القيود البنيوية التي لا يعبّر عنها JSON Schema (data-model §1.3، §4).
import Ajv2020 from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import projectSchema from './schemas/project.schema.json';
import styleSchema from './schemas/style.schema.json';
import transcriptSchema from './schemas/transcript.schema.json';
import commandsSchema from './schemas/commands.schema.json';
import type { CommandName, CommandSpec, ProjectDocument, StyleVersion, Transcript } from './types';
import { expectedFrames } from '../time';

export class ContractError extends Error {
  readonly code: 'schema' | 'invariant';
  readonly details: string[];
  constructor(code: 'schema' | 'invariant', message: string, details: string[]) {
    super(details.length ? `${message}\n${details.join('\n')}` : message);
    this.name = 'ContractError';
    this.code = code;
    this.details = details;
  }
}

type Json = Record<string, unknown>;

// المعرّفات في المخططات نسبية (ai-editor/<x>/1) فيحلّها Ajv إلى ai-editor/project/ai-editor/transcript/1 ويفشل؛
// لذا نُدمج مرجع التفريغ في مكانه كما يفعل scripts/gen-types.ts بدل تغيير العقود.
function inlineTranscriptRef(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(inlineTranscriptRef);
  if (node && typeof node === 'object') {
    const o = node as Json;
    if (o['$ref'] === transcriptSchema.$id) {
      const { $schema: _s, $id: _i, ...rest } = transcriptSchema;
      return rest;
    }
    const out: Json = {};
    for (const [k, v] of Object.entries(o)) out[k] = inlineTranscriptRef(v);
    return out;
  }
  return node;
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const projectValidator = ajv.compile(inlineTranscriptRef(projectSchema) as Json);
const styleValidator = ajv.compile(styleSchema);
const transcriptValidator = ajv.compile(transcriptSchema);

export const commandSpecs: readonly CommandSpec[] = commandsSchema.commands as unknown as CommandSpec[];

// معاملات كل أمر تُترجم مرة واحدة؛ قد تشير إلى #/$defs في جذر commands.schema.json
const paramValidators = new Map<CommandName, ValidateFunction>(
  commandSpecs.map((spec) => [spec.name, ajv.compile({ ...spec.params, $defs: commandsSchema.$defs })]),
);

function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`.trim());
}

function assertSchema(validator: ValidateFunction, doc: unknown, what: string): void {
  if (!validator(doc)) {
    throw new ContractError('schema', `${what} لا يطابق المخطط`, formatErrors(validator.errors));
  }
}

export function checkProjectInvariants(doc: ProjectDocument): string[] {
  const problems: string[] = [];
  const { clips } = doc.timeline;
  let cursor = 0;
  clips.forEach((clip, i) => {
    if (clip.outFrame <= clip.inFrame) problems.push(`clips[${i}] (${clip.id}): outFrame يجب أن يكون > inFrame`);
    if (clip.outFrame > doc.source.frameCount) problems.push(`clips[${i}] (${clip.id}): outFrame يتجاوز source.frameCount`);
    if (clip.timelineStartFrame !== cursor) {
      problems.push(`clips[${i}] (${clip.id}): timelineStartFrame=${clip.timelineStartFrame} والمتوقع ${cursor} (لا فجوات ولا تداخل)`);
    }
    cursor = clip.timelineStartFrame + (clip.outFrame - clip.inFrame);
  });
  const timelineFrames = expectedFrames(clips);
  doc.captions.cues.forEach((cue, i) => {
    if (cue.startFrame < 0 || cue.endFrame <= cue.startFrame || cue.endFrame > timelineFrames) {
      problems.push(`cues[${i}] (${cue.id}): خارج حدود التايم لاين [0, ${timelineFrames}]`);
    }
  });
  doc.proposals.forEach((p, pi) => {
    p.items.forEach((item, ii) => {
      if (item.startUs >= item.endUs || item.endUs > doc.source.durationUs) {
        problems.push(`proposals[${pi}].items[${ii}] (${item.id}): startUs < endUs ≤ source.durationUs مخالَف`);
      }
    });
  });
  if (doc.style.version < 1) problems.push('style.version يجب أن يكون ≥ 1');
  return problems;
}

export function validateProject(doc: unknown): asserts doc is ProjectDocument {
  assertSchema(projectValidator, doc, 'مستند المشروع');
  const problems = checkProjectInvariants(doc as ProjectDocument);
  if (problems.length) throw new ContractError('invariant', 'مستند المشروع يخالف القيود البنيوية', problems);
}

export function validateStyle(doc: unknown): asserts doc is StyleVersion {
  assertSchema(styleValidator, doc, 'إصدار النمط');
}

export function validateTranscript(doc: unknown): asserts doc is Transcript {
  assertSchema(transcriptValidator, doc, 'التفريغ');
}

export function getCommandSpec(name: CommandName): CommandSpec {
  const spec = commandSpecs.find((c) => c.name === name);
  if (!spec) throw new ContractError('schema', `أمر غير معروف: ${String(name)}`, []);
  return spec;
}

export function validateCommandParams(name: CommandName, params: unknown): void {
  const validator = paramValidators.get(name);
  if (!validator) throw new ContractError('schema', `أمر غير معروف: ${String(name)}`, []);
  assertSchema(validator, params, `معاملات الأمر ${name}`);
}
