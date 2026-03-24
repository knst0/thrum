import { describe, it, expect } from "vitest";
import { History } from "../history";

function entry(label: string) {
  return {
    undo: { nodeChanges: [], edgeChanges: [] },
    redo: { nodeChanges: [], edgeChanges: [] },
    _label: label,
  };
}

describe("History", () => {
  it("starts empty", () => {
    const h = new History();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBeNull();
  });

  it("push then undo", () => {
    const h = new History();
    const e = entry("a");
    h.push(e);
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);
    const result = h.undo();
    expect(result).toBe(e.undo);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(true);
  });

  it("undo then redo", () => {
    const h = new History();
    const e = entry("a");
    h.push(e);
    h.undo();
    const result = h.redo();
    expect(result).toBe(e.redo);
    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(false);
  });

  it("push after undo discards redo history", () => {
    const h = new History();
    h.push(entry("a"));
    h.push(entry("b"));
    h.undo(); // undo b
    h.push(entry("c"));
    expect(h.canRedo()).toBe(false);
    const undone = h.undo();
    // Should get c's undo, not b's
    expect(undone).toBeTruthy();
  });

  it("respects maxSize with circular buffer", () => {
    const h = new History(3);
    h.push(entry("a"));
    h.push(entry("b"));
    h.push(entry("c"));
    h.push(entry("d")); // should evict "a"

    // Can undo 3 times (b, c, d)
    expect(h.canUndo()).toBe(true);
    expect(h.undo()).toBeTruthy(); // d
    expect(h.undo()).toBeTruthy(); // c
    expect(h.undo()).toBeTruthy(); // b
    expect(h.canUndo()).toBe(false); // a was evicted
  });

  it("clear resets all state", () => {
    const h = new History();
    h.push(entry("a"));
    h.push(entry("b"));
    h.clear();
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it("interleaved push-undo-redo", () => {
    const h = new History();
    h.push(entry("a"));
    h.push(entry("b"));
    h.push(entry("c"));

    h.undo(); // undo c
    h.undo(); // undo b
    h.redo(); // redo b

    expect(h.canUndo()).toBe(true);
    expect(h.canRedo()).toBe(true); // can still redo c

    h.push(entry("d")); // should discard c from redo
    expect(h.canRedo()).toBe(false);
  });

  it("handles maxSize=1", () => {
    const h = new History(1);
    h.push(entry("a"));
    h.push(entry("b")); // evicts a
    expect(h.undo()).toBeTruthy(); // b
    expect(h.canUndo()).toBe(false);
  });
});
