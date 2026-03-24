import { describe, it, expect } from "vitest";
import { nodeId } from "../types";
import { toInternalNode } from "../store/nodes";
import { getNodesInBox, hitTestNode } from "../store/selection";
import type { NodeBase, InternalNode, NodeId, Viewport } from "../types";
import { recomputeAbsolutePositions } from "../store/nodes";

function makeNode(
  id: string,
  x: number,
  y: number,
  opts: Partial<{ width: number; height: number; hidden: boolean; zIndex: number }> = {},
): InternalNode {
  const base: NodeBase = { id: nodeId(id), position: { x, y }, data: {}, hidden: opts.hidden, zIndex: opts.zIndex };
  const node = toInternalNode(base);
  if (opts.width || opts.height) node.measured = { width: opts.width ?? 150, height: opts.height ?? 50 };
  return node;
}

function nodeMap(...nodes: InternalNode[]): Map<NodeId, InternalNode> {
  const map = new Map<NodeId, InternalNode>();
  for (const n of nodes) map.set(n.id, n);
  recomputeAbsolutePositions(map);
  return map;
}

const viewport: Viewport = { x: 0, y: 0, zoom: 1 };

describe("getNodesInBox", () => {
  it("selects nodes inside the box", () => {
    const nodes = nodeMap(makeNode("a", 10, 10, { width: 50, height: 50 }), makeNode("b", 200, 200, { width: 50, height: 50 }));
    const ids = getNodesInBox(nodes, viewport, { startX: 0, startY: 0, endX: 100, endY: 100 });
    expect(ids).toContain(nodeId("a"));
    expect(ids).not.toContain(nodeId("b"));
  });

  it("skips hidden nodes", () => {
    const nodes = nodeMap(makeNode("a", 10, 10, { width: 50, height: 50, hidden: true }));
    const ids = getNodesInBox(nodes, viewport, { startX: 0, startY: 0, endX: 100, endY: 100 });
    expect(ids).toHaveLength(0);
  });

  it("handles reversed box coordinates", () => {
    const nodes = nodeMap(makeNode("a", 10, 10, { width: 50, height: 50 }));
    const ids = getNodesInBox(nodes, viewport, { startX: 100, startY: 100, endX: 0, endY: 0 });
    expect(ids).toContain(nodeId("a"));
  });

  it("accounts for viewport offset and zoom", () => {
    const vp: Viewport = { x: 100, y: 100, zoom: 2 };
    const nodes = nodeMap(makeNode("a", 10, 10, { width: 50, height: 50 }));
    // In screen space: node is at 10*2+100=120, 10*2+100=120 with size 50*2=100
    // Box from screen 100,100 to 250,250
    const ids = getNodesInBox(nodes, vp, { startX: 100, startY: 100, endX: 250, endY: 250 });
    expect(ids).toContain(nodeId("a"));
  });
});

describe("hitTestNode", () => {
  it("finds node at point", () => {
    const nodes = nodeMap(makeNode("a", 10, 10, { width: 100, height: 100 }));
    const hit = hitTestNode(nodes, viewport, { x: 50, y: 50 });
    expect(hit?.id).toBe(nodeId("a"));
  });

  it("returns null when missing", () => {
    const nodes = nodeMap(makeNode("a", 10, 10, { width: 100, height: 100 }));
    const hit = hitTestNode(nodes, viewport, { x: 500, y: 500 });
    expect(hit).toBeNull();
  });

  it("skips hidden nodes", () => {
    const nodes = nodeMap(makeNode("a", 10, 10, { width: 100, height: 100, hidden: true }));
    const hit = hitTestNode(nodes, viewport, { x: 50, y: 50 });
    expect(hit).toBeNull();
  });

  it("returns highest z-index node on overlap", () => {
    const nodes = nodeMap(
      makeNode("a", 0, 0, { width: 200, height: 200, zIndex: 1 }),
      makeNode("b", 0, 0, { width: 200, height: 200, zIndex: 5 }),
    );
    const hit = hitTestNode(nodes, viewport, { x: 50, y: 50 });
    expect(hit?.id).toBe(nodeId("b"));
  });

  it("uses later node as tiebreaker for same z-index", () => {
    const a = makeNode("a", 0, 0, { width: 200, height: 200 });
    const b = makeNode("b", 0, 0, { width: 200, height: 200 });
    const nodes = nodeMap(a, b);
    const hit = hitTestNode(nodes, viewport, { x: 50, y: 50 });
    // b was inserted later, so with >= comparison it wins
    expect(hit?.id).toBe(nodeId("b"));
  });
});
