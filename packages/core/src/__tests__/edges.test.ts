import { describe, it, expect } from "vitest";
import { nodeId, edgeId } from "../types";
import { addToAdjacency, removeFromAdjacency, getConnected, getIncoming, getOutgoing, wouldCreateCycle } from "../store/edges";
import type { EdgeBase, EdgeId, NodeId } from "../types";

function edge(id: string, source: string, target: string): EdgeBase {
  return { id: edgeId(id), source: nodeId(source), target: nodeId(target) };
}

describe("adjacency operations", () => {
  it("addToAdjacency creates entries for both source and target", () => {
    const adj = new Map<NodeId, Set<EdgeId>>();
    const e = edge("e1", "a", "b");
    addToAdjacency(adj, e);
    expect(adj.get(nodeId("a"))?.has(edgeId("e1"))).toBe(true);
    expect(adj.get(nodeId("b"))?.has(edgeId("e1"))).toBe(true);
  });

  it("removeFromAdjacency removes edge from both nodes", () => {
    const adj = new Map<NodeId, Set<EdgeId>>();
    const e = edge("e1", "a", "b");
    addToAdjacency(adj, e);
    removeFromAdjacency(adj, e);
    expect(adj.get(nodeId("a"))?.has(edgeId("e1"))).toBe(false);
    expect(adj.get(nodeId("b"))?.has(edgeId("e1"))).toBe(false);
  });
});

describe("getConnected / getIncoming / getOutgoing", () => {
  it("returns connected edges", () => {
    const edges = new Map<EdgeId, EdgeBase>();
    const adj = new Map<NodeId, Set<EdgeId>>();
    const e1 = edge("e1", "a", "b");
    const e2 = edge("e2", "b", "c");
    edges.set(e1.id, e1);
    edges.set(e2.id, e2);
    addToAdjacency(adj, e1);
    addToAdjacency(adj, e2);

    expect(getConnected(edges, adj, nodeId("b"))).toHaveLength(2);
    expect(getIncoming(edges, adj, nodeId("b"))).toHaveLength(1);
    expect(getIncoming(edges, adj, nodeId("b"))[0]!.id).toBe(edgeId("e1"));
    expect(getOutgoing(edges, adj, nodeId("b"))).toHaveLength(1);
    expect(getOutgoing(edges, adj, nodeId("b"))[0]!.id).toBe(edgeId("e2"));
  });

  it("returns empty for unconnected node", () => {
    const edges = new Map<EdgeId, EdgeBase>();
    const adj = new Map<NodeId, Set<EdgeId>>();
    expect(getConnected(edges, adj, nodeId("x"))).toEqual([]);
  });
});

describe("wouldCreateCycle", () => {
  it("self-loop is a cycle", () => {
    const edges = new Map<EdgeId, EdgeBase>();
    const adj = new Map<NodeId, Set<EdgeId>>();
    expect(wouldCreateCycle(edges, adj, nodeId("a"), nodeId("a"))).toBe(true);
  });

  it("no cycle in acyclic graph", () => {
    const edges = new Map<EdgeId, EdgeBase>();
    const adj = new Map<NodeId, Set<EdgeId>>();
    const e = edge("e1", "a", "b");
    edges.set(e.id, e);
    addToAdjacency(adj, e);
    // Adding b→c would not create a cycle
    expect(wouldCreateCycle(edges, adj, nodeId("b"), nodeId("c"))).toBe(false);
  });

  it("detects simple cycle a→b, b→a", () => {
    const edges = new Map<EdgeId, EdgeBase>();
    const adj = new Map<NodeId, Set<EdgeId>>();
    const e = edge("e1", "a", "b");
    edges.set(e.id, e);
    addToAdjacency(adj, e);
    // Adding b→a would create cycle
    expect(wouldCreateCycle(edges, adj, nodeId("b"), nodeId("a"))).toBe(true);
  });

  it("detects cycle in diamond graph", () => {
    const edges = new Map<EdgeId, EdgeBase>();
    const adj = new Map<NodeId, Set<EdgeId>>();
    // a→b, a→c, b→d, c→d
    for (const e of [edge("e1", "a", "b"), edge("e2", "a", "c"), edge("e3", "b", "d"), edge("e4", "c", "d")]) {
      edges.set(e.id, e);
      addToAdjacency(adj, e);
    }
    // Adding d→a would create cycle
    expect(wouldCreateCycle(edges, adj, nodeId("d"), nodeId("a"))).toBe(true);
    // Adding d→e would not
    expect(wouldCreateCycle(edges, adj, nodeId("d"), nodeId("e"))).toBe(false);
  });

  it("detects cycle in deep chain", () => {
    const edges = new Map<EdgeId, EdgeBase>();
    const adj = new Map<NodeId, Set<EdgeId>>();
    // a→b→c→d→e
    for (const [_i, e] of [edge("e1", "a", "b"), edge("e2", "b", "c"), edge("e3", "c", "d"), edge("e4", "d", "e")].entries()) {
      edges.set(e.id, e);
      addToAdjacency(adj, e);
    }
    expect(wouldCreateCycle(edges, adj, nodeId("e"), nodeId("a"))).toBe(true);
    expect(wouldCreateCycle(edges, adj, nodeId("e"), nodeId("c"))).toBe(true);
    expect(wouldCreateCycle(edges, adj, nodeId("c"), nodeId("e"))).toBe(false);
  });
});
