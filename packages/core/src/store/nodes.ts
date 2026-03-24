import type { NodeBase, InternalNode, NodeId, XY } from "../types";

export const DEFAULT_NODE_WIDTH = 150;
export const DEFAULT_NODE_HEIGHT = 50;

export function toInternalNode<T>(node: NodeBase<T>): InternalNode<T> {
  return {
    ...node,
    measured: null,
    absolutePosition: { ...node.position },
    handleBounds: null,
    selected: false,
    dragging: false,
    resizing: false,
  };
}

// Iterative topological sort — safe for deep hierarchies, no stack overflow risk
export function recomputeAbsolutePositions(nodes: Map<NodeId, InternalNode>): void {
  const indegree = new Map<NodeId, number>();
  const children = new Map<NodeId, NodeId[]>();

  for (const node of nodes.values()) {
    if (!indegree.has(node.id)) indegree.set(node.id, 0);
    if (node.parentId && nodes.has(node.parentId)) {
      indegree.set(node.id, (indegree.get(node.id) ?? 0) + 1);
      const siblings = children.get(node.parentId) ?? [];
      siblings.push(node.id);
      children.set(node.parentId, siblings);
    }
  }

  const queue: NodeId[] = [];
  for (const [id, deg] of indegree) {
    if (deg === 0) queue.push(id);
  }

  let i = 0;
  while (i < queue.length) {
    const id = queue[i++]!; // Safe: i < queue.length is the loop condition.
    const node = nodes.get(id);
    if (!node) continue;

    if (node.parentId) {
      const parent = nodes.get(node.parentId);
      node.absolutePosition = parent
        ? { x: parent.absolutePosition.x + node.position.x, y: parent.absolutePosition.y + node.position.y }
        : { ...node.position };
    } else {
      node.absolutePosition = { ...node.position };
    }

    for (const childId of children.get(id) ?? []) {
      const deg = (indegree.get(childId) ?? 1) - 1;
      indegree.set(childId, deg);
      if (deg === 0) queue.push(childId);
    }
  }
}

/**
 * Recompute absolute positions for a single node and its descendants.
 * More efficient than full recompute when only one node moved.
 */
export function recomputeSubtree(nodes: Map<NodeId, InternalNode>, childIndex: Map<NodeId, Set<NodeId>>, rootId: NodeId): void {
  const root = nodes.get(rootId);
  if (!root) return;

  // Recompute root's absolute position
  if (root.parentId) {
    const parent = nodes.get(root.parentId);
    root.absolutePosition = parent
      ? { x: parent.absolutePosition.x + root.position.x, y: parent.absolutePosition.y + root.position.y }
      : { ...root.position };
  } else {
    root.absolutePosition = { ...root.position };
  }

  // BFS through descendants
  const queue: NodeId[] = [];
  const children = childIndex.get(rootId);
  if (children) for (const id of children) queue.push(id);

  let i = 0;
  while (i < queue.length) {
    const id = queue[i++]!;
    const node = nodes.get(id);
    if (!node) continue;

    const parent = nodes.get(node.parentId!);
    node.absolutePosition = parent
      ? { x: parent.absolutePosition.x + node.position.x, y: parent.absolutePosition.y + node.position.y }
      : { ...node.position };

    const nodeChildren = childIndex.get(id);
    if (nodeChildren) for (const childId of nodeChildren) queue.push(childId);
  }
}

export function snapPosition(position: XY, snapToGrid: boolean, snapGrid: [number, number]): XY {
  if (!snapToGrid) return position;
  return {
    x: Math.round(position.x / snapGrid[0]) * snapGrid[0],
    y: Math.round(position.y / snapGrid[1]) * snapGrid[1],
  };
}

export function getNodesBoundingBox(nodes: InternalNode[]): { x: number; y: number; width: number; height: number } | null {
  if (nodes.length === 0) return null;

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const node of nodes) {
    const { x, y } = node.absolutePosition;
    const w = node.measured?.width ?? DEFAULT_NODE_WIDTH;
    const h = node.measured?.height ?? DEFAULT_NODE_HEIGHT;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
