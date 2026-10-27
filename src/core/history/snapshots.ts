import type { CommandName, ProjectDocument } from '../contracts/types';

export type Actor = 'user' | 'agent';

/** مدخل سجل (data-model §1.9): اللقطة هي حالة المشروع **قبل** الأمر. */
export interface HistoryEntry {
  seq: number;
  at: string;
  actor: Actor;
  command: { name: CommandName; params: unknown };
  description: string;
  snapshot: ProjectDocument;
}

export interface HistoryJSON {
  undo: HistoryEntry[];
  redo: HistoryEntry[];
  nextSeq: number;
}

const DEFAULT_LIMIT = 200; // FR-015

export class History {
  readonly limit: number;
  private undoStack: HistoryEntry[];
  private redoStack: HistoryEntry[];
  private nextSeq: number;

  constructor(opts: { limit?: number; entries?: HistoryEntry[]; redo?: HistoryEntry[]; nextSeq?: number } = {}) {
    this.limit = opts.limit ?? DEFAULT_LIMIT;
    this.undoStack = [...(opts.entries ?? [])];
    this.redoStack = [...(opts.redo ?? [])];
    this.nextSeq = opts.nextSeq ?? 1;
    this.fold();
  }

  push(e: Omit<HistoryEntry, 'seq'>): HistoryEntry {
    const entry: HistoryEntry = { ...e, seq: this.nextSeq++ };
    this.undoStack.push(entry);
    this.redoStack = [];
    this.fold();
    return entry;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** يستعيد اللقطة ويحتفظ بالحالة الحالية في مكدس الإعادة تحت المدخل نفسه. */
  undo(current: ProjectDocument): { project: ProjectDocument; entry: HistoryEntry } | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push({ ...entry, snapshot: current });
    return { project: entry.snapshot, entry };
  }

  redo(current: ProjectDocument): { project: ProjectDocument; entry: HistoryEntry } | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push({ ...entry, snapshot: current });
    return { project: entry.snapshot, entry };
  }

  entries(): readonly HistoryEntry[] {
    return this.undoStack;
  }

  redoEntries(): readonly HistoryEntry[] {
    return this.redoStack;
  }

  toJSON(): HistoryJSON {
    return { undo: [...this.undoStack], redo: [...this.redoStack], nextSeq: this.nextSeq };
  }

  static fromJSON(j: HistoryJSON, limit?: number): History {
    return new History({ limit, entries: j.undo, redo: j.redo, nextSeq: j.nextSeq });
  }

  // طيّ الأقدم: يبقى آخر `limit` مدخلاً فقط (FR-015).
  private fold(): void {
    if (this.undoStack.length > this.limit) this.undoStack.splice(0, this.undoStack.length - this.limit);
  }
}
