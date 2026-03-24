import type { NodeId, InternalNode, Viewport, Rect, XY } from "../types";
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from "./nodes";

function rectIntersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export interface BoxSelection {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function boxToFlowRect(box: BoxSelection, viewport: Viewport): Rect {
  const x = Math.min(box.startX, box.endX);
  const y = Math.min(box.startY, box.endY);
  const width = Math.abs(box.endX - box.startX);
  const height = Math.abs(box.endY - box.startY);
  return {
    x: (x - viewport.x) / viewport.zoom,
    y: (y - viewport.y) / viewport.zoom,
    width: width / viewport.zoom,
    height: height / viewport.zoom,
  };
}

export function getNodesInBox(nodes: Map<NodeId, InternalNode>, viewport: Viewport, box: BoxSelection): NodeId[] {
  const flowRect = boxToFlowRect(box, viewport);
  const result: NodeId[] = [];
  for (const node of nodes.values()) {
    if (node.hidden) continue;
    const nodeRect: Rect = {
      x: node.absolutePosition.x,
      y: node.absolutePosition.y,
      width: node.measured?.width ?? DEFAULT_NODE_WIDTH,
      height: node.measured?.height ?? DEFAULT_NODE_HEIGHT,
    };
    if (rectIntersects(flowRect, nodeRect)) result.push(node.id);
  }
  return result;
}

export function hitTestNode(nodes: Map<NodeId, InternalNode>, viewport: Viewport, screenPoint: XY): InternalNode | null {
  const flowPoint = {
    x: (screenPoint.x - viewport.x) / viewport.zoom,
    y: (screenPoint.y - viewport.y) / viewport.zoom,
  };

  let topNode: InternalNode | null = null;
  let topZ = -Infinity;

  for (const node of nodes.values()) {
    if (node.hidden) continue;
    const { x, y } = node.absolutePosition;
    const w = node.measured?.width ?? DEFAULT_NODE_WIDTH;
    const h = node.measured?.height ?? DEFAULT_NODE_HEIGHT;
    const z = node.zIndex ?? 0;
    if (flowPoint.x >= x && flowPoint.x <= x + w && flowPoint.y >= y && flowPoint.y <= y + h && z >= topZ) {
      topNode = node;
      topZ = z;
    }
  }

  return topNode;
}
