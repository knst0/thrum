import type { DragState, FlowStore, NodeChange, NodeId } from "@thrum/core";
import { computeDragPosition, createDragState } from "@thrum/core";

export function createNodeDrag(store: FlowStore) {
  let drag: DragState | null = null;

  function onPointerDown(e: PointerEvent, nodeId: NodeId) {
    if (e.button !== 0) return;
    const node = store.getNode(nodeId);
    if (!node || node.draggable === false) return;

    e.stopPropagation();

    // Ctrl+click: remove this node from selection, do not start drag
    if (e.ctrlKey) {
      store.applyNodeChanges([{ type: "select", id: nodeId, selected: false }]);
      return;
    }

    const state = store.getState();

    if (e.shiftKey) {
      // Shift+click: toggle this node in the existing selection, do not start drag
      store.applyNodeChanges([{ type: "select", id: nodeId, selected: !node.selected }]);
      return;
    }

    // Plain click: replace selection with only this node
    const changes: NodeChange[] = [];
    for (const id of state.selectedNodes) {
      if (id !== nodeId) changes.push({ type: "select", id, selected: false });
    }
    changes.push({ type: "select", id: nodeId, selected: true });
    store.applyNodeChanges(changes);

    drag = createDragState(nodeId, { x: e.clientX, y: e.clientY }, node.position, state.viewport);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent, nodeId: NodeId) {
    if (!drag || drag.nodeId !== nodeId) return;
    const state = store.getState();
    const pos = computeDragPosition(drag, { x: e.clientX, y: e.clientY }, state);
    store.applyNodeChanges([{ type: "position", id: nodeId, position: pos, dragging: true }]);
  }

  function onPointerUp(e: PointerEvent, nodeId: NodeId) {
    if (!drag || drag.nodeId !== nodeId) return;
    const state = store.getState();
    const pos = computeDragPosition(drag, { x: e.clientX, y: e.clientY }, state);
    store.applyNodeChanges([{ type: "position", id: nodeId, position: pos, dragging: false }]);
    drag = null;
  }

  return { onPointerDown, onPointerMove, onPointerUp };
}
