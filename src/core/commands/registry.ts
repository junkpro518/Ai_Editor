import type { CommandName, CommandParamsMap, ProjectDocument } from '../contracts/types';
import { getCommandSpec, validateCommandParams, validateProject } from '../contracts/validate';
import type { Actor, History, HistoryEntry } from '../history/snapshots';
import { commands } from './index';
import type { CommandContext, CommandImpl, CommandResult } from './types';
import { CommandError } from './types';

export interface ExecuteOptions {
  actor: Actor;
  history: History;
  confirmed?: boolean;
}

export interface ExecuteResult extends CommandResult {
  entry?: HistoryEntry;
}

/**
 * المسار الموحد لكل أمر (contracts/README.md): تحقق المعاملات ← الفاعل ← التأكيد ←
 * لقطة إن كان undoable ← تنفيذ نقي ← تحقق المخرج. التراجع/الإعادة يُخدمان من History مباشرة.
 */
export function execute<N extends CommandName>(
  project: ProjectDocument,
  name: N,
  params: CommandParamsMap[N],
  ctx: CommandContext,
  opts: ExecuteOptions,
): ExecuteResult {
  const spec = getCommandSpec(name);
  validateCommandParams(name, params);
  if (!spec.actors.includes(opts.actor)) {
    throw new CommandError('actor_not_allowed', `الفاعل ${opts.actor} لا يملك صلاحية ${name}`);
  }
  if (spec.confirm && !opts.confirmed) {
    throw new CommandError('confirmation_required', `الأمر ${name} يحتاج تأكيداً منفصلاً`);
  }

  if (name === 'history.undo') {
    const r = opts.history.undo(project);
    if (!r) throw new CommandError('nothing_to_undo', 'لا يوجد ما يُتراجع عنه');
    return { project: r.project, description: `تراجع: ${r.entry.description}`, entry: r.entry };
  }
  if (name === 'history.redo') {
    const r = opts.history.redo(project);
    if (!r) throw new CommandError('nothing_to_redo', 'لا يوجد ما يُعاد');
    return { project: r.project, description: `إعادة: ${r.entry.description}`, entry: r.entry };
  }

  const before = structuredClone(project);
  const impl = commands[name] as CommandImpl<N>;
  const result = impl(project, params, ctx);
  const next: ProjectDocument = { ...result.project, updatedAt: ctx.now() };
  validateProject(next);

  const entry = spec.undoable
    ? opts.history.push({
        at: ctx.now(),
        actor: opts.actor,
        command: { name, params },
        description: result.description,
        snapshot: before,
      })
    : undefined;
  return { ...result, project: next, entry };
}
