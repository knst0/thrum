import type { NodeId, XY, Viewport } from "./types";
import { screenToFlow } from "./store/viewport";
import { snapPosition } from "./store/nodes";

export interface DragState {
  nodeId: NodeId;
  startPointer: XY;
  startPosition: XY;
}

export interface DragContext {
  viewport: Viewport;
  snapToGrid: boolean;
  snapGrid: [number, number];
}

export function createDragState(nodeId: NodeId, pointerScreenPos: XY, nodePosition: XY, viewport: Viewport): DragState {
  return {
    nodeId,
    startPointer: screenToFlow(pointerScreenPos, viewport),
    startPosition: { ...nodePosition },
  };
}

export function computeDragPosition(drag: DragState, pointerScreenPos: XY, ctx: DragContext): XY {
  const flowPointer = screenToFlow(pointerScreenPos, ctx.viewport);
  return snapPosition(
    {
      x: drag.startPosition.x + (flowPointer.x - drag.startPointer.x),
      y: drag.startPosition.y + (flowPointer.y - drag.startPointer.y),
    },
    ctx.snapToGrid,
    ctx.snapGrid,
  );
}
