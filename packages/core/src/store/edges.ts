import type { EdgeBase, EdgeId, NodeId } from "../types";

export function addToAdjacency(adjacency: Map<NodeId, Set<EdgeId>>, edge: EdgeBase): void {
  for (const nodeId of [edge.source, edge.target]) {
    const set = adjacency.get(nodeId) ?? new Set();
    set.add(edge.id);
    adjacency.set(nodeId, set);
  }
}

export function removeFromAdjacency(adjacency: Map<NodeId, Set<EdgeId>>, edge: EdgeBase): void {
  adjacency.get(edge.source)?.delete(edge.id);
  adjacency.get(edge.target)?.delete(edge.id);
}

export function removeConnectedEdges(
  edges: Map<EdgeId, EdgeBase>,
  adjacency: Map<NodeId, Set<EdgeId>>,
  selectedEdges: Set<EdgeId>,
  nodeId: NodeId,
): void {
  const connected = adjacency.get(nodeId);
  if (!connected) return;
  for (const edgeId of connected) {
    const edge = edges.get(edgeId);
    if (!edge) continue;
    edges.delete(edgeId);
    selectedEdges.delete(edgeId);
    adjacency.get(edge.source)?.delete(edgeId);
    adjacency.get(edge.target)?.delete(edgeId);
  }
  adjacency.delete(nodeId);
}

export function getConnected(edges: Map<EdgeId, EdgeBase>, adjacency: Map<NodeId, Set<EdgeId>>, nodeId: NodeId): EdgeBase[] {
  const ids = adjacency.get(nodeId);
  if (!ids) return [];
  return [...ids].flatMap((id) => {
    const e = edges.get(id);
    return e ? [e] : [];
  });
}

export function getIncoming(edges: Map<EdgeId, EdgeBase>, adjacency: Map<NodeId, Set<EdgeId>>, nodeId: NodeId): EdgeBase[] {
  return getConnected(edges, adjacency, nodeId).filter((e) => e.target === nodeId);
}

export function getOutgoing(edges: Map<EdgeId, EdgeBase>, adjacency: Map<NodeId, Set<EdgeId>>, nodeId: NodeId): EdgeBase[] {
  return getConnected(edges, adjacency, nodeId).filter((e) => e.source === nodeId);
}

// BFS with index cursor — O(V+E) instead of O(V*E)
export function wouldCreateCycle(
  edges: Map<EdgeId, EdgeBase>,
  adjacency: Map<NodeId, Set<EdgeId>>,
  source: NodeId,
  target: NodeId,
): boolean {
  if (source === target) return true;
  const visited = new Set<NodeId>();
  const queue = [target];
  let i = 0;
  while (i < queue.length) {
    const current = queue[i++]!; // Safe: i < queue.length is the loop condition.
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const edgeIds = adjacency.get(current);
    if (!edgeIds) continue;
    for (const edgeId of edgeIds) {
      const edge = edges.get(edgeId);
      if (edge && edge.source === current) queue.push(edge.target);
    }
  }
  return false;
}
