import type { NodeChange, EdgeChange } from "./types.ts";

/** The pair of changes to apply when undoing or redoing an operation. */
export interface HistoryChangeset {
  nodeChanges: NodeChange[];
  edgeChanges: EdgeChange[];
}

/**
 * A single history entry contains both sides of an operation so that
 * undo and redo can be applied independently.
 *
 * **Caller responsibility**: changes that contain `NodeBase.data` (the `add`
 * and `replace` change types) reference user-provided objects. If `data` is
 * mutable, callers must snapshot it (e.g. via `structuredClone`) before
 * pushing to avoid aliasing bugs when the original mutates later.
 */
export interface HistoryEntry {
  undo: HistoryChangeset;
  redo: HistoryChangeset;
}

/**
 * Circular buffer history — all operations are O(1).
 */
export class History {
  private readonly buffer: (HistoryEntry | undefined)[];
  /** Points to the slot *after* the current entry (next write position). */
  private head = 0;
  /** Number of valid entries behind head (undo-able). */
  private undoCount = 0;
  /** Number of valid entries ahead of head (redo-able). */
  private redoCount = 0;

  constructor(private readonly maxSize = 100) {
    this.buffer = Array.from({ length: maxSize });
  }

  push(entry: HistoryEntry): void {
    this.buffer[this.head] = entry;
    this.head = (this.head + 1) % this.maxSize;
    this.undoCount = Math.min(this.undoCount + 1, this.maxSize);
    // New entry invalidates any redo history.
    this.redoCount = 0;
  }

  undo(): HistoryChangeset | null {
    if (this.undoCount === 0) return null;
    this.head = (this.head - 1 + this.maxSize) % this.maxSize;
    this.undoCount--;
    this.redoCount++;
    return this.buffer[this.head]!.undo;
  }

  redo(): HistoryChangeset | null {
    if (this.redoCount === 0) return null;
    const entry = this.buffer[this.head]!;
    this.head = (this.head + 1) % this.maxSize;
    this.undoCount++;
    this.redoCount--;
    return entry.redo;
  }

  canUndo(): boolean {
    return this.undoCount > 0;
  }

  canRedo(): boolean {
    return this.redoCount > 0;
  }

  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.undoCount = 0;
    this.redoCount = 0;
  }
}
