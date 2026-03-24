import { describe, it, expect } from "vitest";
import { nodeId } from "../types";
import { toInternalNode, recomputeAbsolutePositions, recomputeSubtree, snapPosition, getNodesBoundingBox } from "../store/nodes";
import type { NodeBase, InternalNode, NodeId } from "../types";

function makeNode(id: string, x: number, y: number, parentId?: string): NodeBase {
  return { id: nodeId(id), position: { x, y }, data: {}, parentId: parentId ? nodeId(parentId) : undefined };
}

function makeInternalMap(...nodes: NodeBase[]): Map<NodeId, InternalNode> {
  const map = new Map<NodeId, InternalNode>();
  for (const n of nodes) map.set(n.id, toInternalNode(n));
  return map;
}

describe("toInternalNode", () => {
  it("converts NodeBase to InternalNode with defaults", () => {
    const node = makeNode("a", 10, 20);
    const internal = toInternalNode(node);
    expect(internal.measured).toBeNull();
    expect(internal.absolutePosition).toEqual({ x: 10, y: 20 });
    expect(internal.handleBounds).toBeNull();
    expect(internal.selected).toBe(false);
    expect(internal.dragging).toBe(false);
    expect(internal.resizing).toBe(false);
  });

  it("copies position (not reference)", () => {
    const node = makeNode("a", 10, 20);
    const internal = toInternalNode(node);
    node.position.x = 999;
    expect(internal.absolutePosition.x).toBe(10);
  });
});

describe("recomputeAbsolutePositions", () => {
  it("flat nodes get absolutePosition = position", () => {
    const nodes = makeInternalMap(makeNode("a", 10, 20), makeNode("b", 30, 40));
    recomputeAbsolutePositions(nodes);
    expect(nodes.get(nodeId("a"))!.absolutePosition).toEqual({ x: 10, y: 20 });
    expect(nodes.get(nodeId("b"))!.absolutePosition).toEqual({ x: 30, y: 40 });
  });

  it("child node adds parent absolutePosition", () => {
    const nodes = makeInternalMap(makeNode("parent", 100, 200), makeNode("child", 10, 20, "parent"));
    recomputeAbsolutePositions(nodes);
    expect(nodes.get(nodeId("child"))!.absolutePosition).toEqual({ x: 110, y: 220 });
  });

  it("deep hierarchy accumulates positions", () => {
    const nodes = makeInternalMap(makeNode("a", 100, 100), makeNode("b", 10, 10, "a"), makeNode("c", 5, 5, "b"));
    recomputeAbsolutePositions(nodes);
    expect(nodes.get(nodeId("c"))!.absolutePosition).toEqual({ x: 115, y: 115 });
  });

  it("handles orphaned parentId gracefully", () => {
    const nodes = makeInternalMap(makeNode("a", 10, 20, "nonexistent"));
    recomputeAbsolutePositions(nodes);
    // Orphaned node gets its own position as absolute
    expect(nodes.get(nodeId("a"))!.absolutePosition).toEqual({ x: 10, y: 20 });
  });
});

describe("recomputeSubtree", () => {
  it("recomputes single node and its children", () => {
    const parent = makeNode("p", 100, 100);
    const child = makeNode("c", 10, 10, "p");
    const nodes = makeInternalMap(parent, child);
    recomputeAbsolutePositions(nodes);

    // Move parent
    nodes.get(nodeId("p"))!.position = { x: 200, y: 200 };
    const childIndex = new Map<NodeId, Set<NodeId>>();
    childIndex.set(nodeId("p"), new Set([nodeId("c")]));

    recomputeSubtree(nodes, childIndex, nodeId("p"));
    expect(nodes.get(nodeId("p"))!.absolutePosition).toEqual({ x: 200, y: 200 });
    expect(nodes.get(nodeId("c"))!.absolutePosition).toEqual({ x: 210, y: 210 });
  });
});

describe("snapPosition", () => {
  it("returns position unchanged when snapping disabled", () => {
    expect(snapPosition({ x: 13, y: 27 }, false, [10, 10])).toEqual({ x: 13, y: 27 });
  });

  it("snaps to grid when enabled", () => {
    expect(snapPosition({ x: 13, y: 27 }, true, [10, 10])).toEqual({ x: 10, y: 30 });
  });

  it("snaps with asymmetric grid", () => {
    // Math.round(37/15) = Math.round(2.47) = 2, 2*15 = 30
    expect(snapPosition({ x: 12, y: 37 }, true, [5, 15])).toEqual({ x: 10, y: 30 });
  });
});

describe("getNodesBoundingBox", () => {
  it("returns null for empty array", () => {
    expect(getNodesBoundingBox([])).toBeNull();
  });

  it("returns bounding box for single node", () => {
    const node = toInternalNode(makeNode("a", 10, 20));
    node.measured = { width: 100, height: 50 };
    const box = getNodesBoundingBox([node]);
    expect(box).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it("returns bounding box for multiple nodes", () => {
    const a = toInternalNode(makeNode("a", 0, 0));
    a.measured = { width: 50, height: 50 };
    const b = toInternalNode(makeNode("b", 100, 100));
    b.measured = { width: 50, height: 50 };
    const box = getNodesBoundingBox([a, b]);
    expect(box).toEqual({ x: 0, y: 0, width: 150, height: 150 });
  });

  it("uses default dimensions when measured is null", () => {
    const node = toInternalNode(makeNode("a", 0, 0));
    const box = getNodesBoundingBox([node]);
    expect(box).toEqual({ x: 0, y: 0, width: 150, height: 50 });
  });
});
