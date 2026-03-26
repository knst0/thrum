import { createSignal } from "solid-js";
import type { FlowStore } from "@thrum/core";
import { getNodesInBox } from "@thrum/core";
import { selectionPlugin } from "@thrum/core/plugins";

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
  const plugin = store.getPlugin(selectionPlugin);
  const [rect, setRect] = createSignal<BoxSelectionRect | null>(null);
  let rafId = 0;

  function onPointerDown(e: PointerEvent) {
    if (!plugin) return;
    if (e.button !== 0) return;
    if (e.pointerType === "touch") return;
    if (hasNodeAncestor(e.target)) return;
    plugin.start(e.clientX, e.clientY);
    store.setSelectedNodes([]);
    store.setSelectedEdges([]);
  }

  function onPointerMove(e: PointerEvent) {
    if (!plugin) return;
    const r = plugin.update(e.clientX, e.clientY);
    setRect(r);
    if (!r) return;

    cancelAnimationFrame(rafId);
    const { x: startX, y: startY } = plugin.getStart();
    const endX = e.clientX;
    const endY = e.clientY;
    rafId = requestAnimationFrame(() => {
      const state = store.getState();
      const ids = getNodesInBox(state.nodes, state.viewport, { startX, startY, endX, endY });
      store.setSelectedNodes(ids);
    });
  }

  function onPointerUp(_e: PointerEvent) {
    if (!plugin) return;
    plugin.end();
    cancelAnimationFrame(rafId);
    setRect(null);
  }

  return { rect, onPointerDown, onPointerMove, onPointerUp };
}
