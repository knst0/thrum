import { createSignal } from "solid-js";
import type { FlowStore } from "@thrum/core";
import { getNodesInBox } from "@thrum/core";

export interface BoxSelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function hasNodeAncestor(el: EventTarget | null): boolean {
  let target = el as Element | null;
  while (target) {
    if ((target as HTMLElement).dataset?.nodeid !== undefined) return true;
    target = target.parentElement;
  }
  return false;
}

export function createBoxSelection(store: FlowStore) {
  let startX = 0;
  let startY = 0;
  let active = false;
  const [rect, setRect] = createSignal<BoxSelectionRect | null>(null);

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return;
    if (hasNodeAncestor(e.target)) return;
    startX = e.clientX;
    startY = e.clientY;
    active = true;
    store.setSelectedNodes([]);
    store.setSelectedEdges([]);
  }

  let selectionRaf = 0;
  function onPointerMove(e: PointerEvent) {
    if (!active) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;

    setRect({
      x: Math.min(startX, e.clientX),
      y: Math.min(startY, e.clientY),
      width: Math.abs(dx),
      height: Math.abs(dy),
    });

    cancelAnimationFrame(selectionRaf);
    const endX = e.clientX;
    const endY = e.clientY;
    selectionRaf = requestAnimationFrame(() => {
      const state = store.getState();
      const ids = getNodesInBox(state.nodes, state.viewport, { startX, startY, endX, endY });
      store.setSelectedNodes(ids);
    });
  }

  function onPointerUp(_e: PointerEvent) {
    active = false;
    setRect(null);
  }

  return { rect, onPointerDown, onPointerMove, onPointerUp };
}
