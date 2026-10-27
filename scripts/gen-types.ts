// T008: توليد src/core/contracts/types.ts من specs/001-proof-of-concept/contracts/*.schema.json
// المخططات مترابطة بـ $id (project → transcript، commands → project#/$defs/proposal)،
// لذا نحلّها بأنفسنا عبر $refOptions.resolve ونعطي كل مخطط عنواناً ثابتاً.
import { compile } from 'json-schema-to-typescript';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACTS = path.join(ROOT, 'specs/001-proof-of-concept/contracts');
const OUT = path.join(ROOT, 'src/core/contracts/types.ts');

type Json = Record<string, unknown>;
async function load(name: string): Promise<Json> {
  return JSON.parse(await readFile(path.join(CONTRACTS, `${name}.schema.json`), 'utf8')) as Json;
}

const [project, style, transcript, commands] = await Promise.all([
  load('project'),
  load('style'),
  load('transcript'),
  load('commands'),
]);

// المراجع العابرة للملفات (ai-editor/<name>/1[#/...]) تُدمج في مكانها قبل التوليد،
// لأن json-schema-ref-parser يعامل أي $ref غير "#" كمسار ملف.
const byId = new Map<string, Json>([
  [project.$id as string, project],
  [style.$id as string, style],
  [transcript.$id as string, transcript],
  [commands.$id as string, commands],
]);
function pointer(root: Json, hash: string): Json {
  let cur: unknown = root;
  for (const seg of hash.replace(/^#\/?/, '').split('/').filter(Boolean)) cur = (cur as Json)[seg];
  return cur as Json;
}
function inlineRefs(node: unknown, titleFor?: string): unknown {
  if (Array.isArray(node)) return node.map((n) => inlineRefs(n));
  if (node && typeof node === 'object') {
    const o = node as Json;
    if (typeof o.$ref === 'string' && o.$ref.startsWith('ai-editor/')) {
      const [id, hash] = o.$ref.split('#');
      const target = byId.get(id!);
      if (!target) throw new Error(`مخطط غير معروف: ${o.$ref}`);
      const picked = hash ? pointer(target, hash) : target;
      const { $schema: _s, $id: _i, ...rest } = picked;
      const copy = inlineRefs(rest) as Json;
      if (!hash) copy.title = titleFor ?? (id === transcript.$id ? 'Transcript' : copy.title);
      return copy;
    }
    const out: Json = {};
    for (const [k, v] of Object.entries(o)) out[k] = inlineRefs(v);
    return out;
  }
  return node;
}

const common = {
  bannerComment: '',
  additionalProperties: false,
  strictIndexSignatures: true,
  style: { singleQuote: true, semi: true, printWidth: 110 },
};

const header = `/* eslint-disable */
/**
 * مولَّد آلياً من specs/001-proof-of-concept/contracts/*.schema.json — لا تعدّل يدوياً.
 * التجديد: pnpm gen:types
 */
`;

const projectTs = await compile({ ...(inlineRefs(project) as Json), title: 'ProjectDocument' }, 'ProjectDocument', common);
const styleTs = await compile({ ...style, title: 'StyleVersion' }, 'StyleVersion', common);
const transcriptTs = await compile({ ...transcript, title: 'Transcript' }, 'Transcript', common);

// الأوامر: المصفوفة بيانات لا مخطط؛ نولّد نوع المعاملات لكل أمر من params الخاص به.
const list = commands.commands as Array<{ name: string; params: Json; undoable: boolean; confirm: boolean; actors: string[] }>;
const paramTypes: string[] = [];
const nameToType: string[] = [];
for (const c of list) {
  const typeName = 'Params' + c.name.split('.').map((p) => p[0]!.toUpperCase() + p.slice(1)).join('');
  // معاملات الأمر قد تشير إلى #/$defs في جذر commands.schema.json
  const ts = await compile({ ...(inlineRefs(c.params) as Json), $defs: commands.$defs, $id: undefined, title: typeName }, typeName, {
    ...common,
    bannerComment: '',
  });
  paramTypes.push(ts.trim());
  nameToType.push(`  '${c.name}': ${typeName};`);
}
const commandsTs = `
/** أسماء الأوامر العشرين (commands.schema.json) */
export type CommandName = ${list.map((c) => `'${c.name}'`).join(' | ')};

export interface CommandParamsMap {
${nameToType.join('\n')}
}

${paramTypes.join('\n\n')}

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
`;

// أنواع Transcript تتكرر داخل ProjectDocument (بسبب الـ$ref)؛ نزيل التكرار بإبقاء النسخة الأولى من كل export.
function dedupe(src: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  const blocks = src.split(/\n(?=export (?:interface|type) )/);
  for (const b of blocks) {
    const m = b.match(/^export (?:interface|type) (\w+)/);
    const key = m?.[1];
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(b);
  }
  return out.join('\n');
}

// Rule1..RuleN نسخ متطابقة من $defs/rule تختلف فقط في وصف الحقل المُشير → توحيدها ثم إزالة التكرار
const body = dedupe([projectTs, styleTs, transcriptTs, commandsTs].join('\n').replace(/\bRule\d+\b/g, 'Rule'));
await mkdir(path.dirname(OUT), { recursive: true });
// نسخة المخططات داخل المصدر (T008) حتى يحمّلها ajv وقت التشغيل بلا الرجوع إلى specs/
const SCHEMAS_DIR = path.join(ROOT, 'src/core/contracts/schemas');
await mkdir(SCHEMAS_DIR, { recursive: true });
for (const n of ['project', 'style', 'transcript', 'commands']) {
  await writeFile(path.join(SCHEMAS_DIR, `${n}.schema.json`), await readFile(path.join(CONTRACTS, `${n}.schema.json`), 'utf8'));
}
await writeFile(OUT, header + body, 'utf8');
console.log(`كُتب ${path.relative(ROOT, OUT)} (${body.length} حرفاً، ${list.length} أمراً)`);

// ---- مدقّقات مُترجمة مسبقاً (بلا new Function وقت التشغيل → CSP بلا 'unsafe-eval') ----
const ajv = new Ajv2020({ allErrors: true, strict: false, code: { source: true, esm: true, lines: true } });
addFormats(ajv);
ajv.addSchema(inlineRefs(project) as Json, 'project');
ajv.addSchema({ ...style }, 'style');
ajv.addSchema({ ...transcript }, 'transcript');
const exportMap: Record<string, string> = { validateProject: 'project', validateStyle: 'style', validateTranscript: 'transcript' };
for (const c of list) {
  const key = 'cmd_' + c.name.replace(/\./g, '_');
  ajv.addSchema({ ...(inlineRefs(c.params) as Json), $defs: commands.$defs }, key);
  exportMap[key] = key;
}
const js = standaloneCode(ajv, exportMap);
const VALIDATORS_JS = path.join(ROOT, 'src/core/contracts/validators.generated.js');
await writeFile(VALIDATORS_JS, '/* eslint-disable */\n// مولَّد آلياً (pnpm gen:types) — ajv standalone، لا تعدّل يدوياً.\n' + js, 'utf8');
const dts = `/* مولَّد آلياً (pnpm gen:types) — لا تعدّل يدوياً */
import type { ValidateFunction } from 'ajv';
export const validateProject: ValidateFunction;
export const validateStyle: ValidateFunction;
export const validateTranscript: ValidateFunction;
${Object.keys(exportMap).filter((k) => k.startsWith('cmd_')).map((k) => `export const ${k}: ValidateFunction;`).join('\n')}
`;
await writeFile(VALIDATORS_JS.replace(/\.js$/, '.d.ts'), dts, 'utf8');
console.log(`كُتب src/core/contracts/validators.generated.js (${js.length} حرفاً)`);
