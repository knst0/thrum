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

export function createBoxSelection(store: FlowStore, getContainer: () => HTMLElement) {
  const plugin = store.getPlugin(selectionPlugin);
  const [rect, setRect] = createSignal<BoxSelectionRect | null>(null);
  let rafId = 0;

  function toRelative(clientX: number, clientY: number): { x: number; y: number } {
    const r = getContainer().getBoundingClientRect();
    return { x: clientX - r.left, y: clientY - r.top };
  }

  function onPointerDown(e: PointerEvent): boolean {
    if (!plugin) return false;
    if (e.button !== 0) return false;
    if (e.pointerType === "touch") return false;
    if (hasNodeAncestor(e.target)) return false;
    const { x, y } = toRelative(e.clientX, e.clientY);
    plugin.start(x, y);
    store.setSelectedNodes([]);
    store.setSelectedEdges([]);
    return true;
  }

  function onPointerMove(e: PointerEvent) {
    if (!plugin) return;
    const { x: endX, y: endY } = toRelative(e.clientX, e.clientY);
    const r = plugin.update(endX, endY);
    setRect(r);
    if (!r) return;

    cancelAnimationFrame(rafId);
    const { x: startX, y: startY } = plugin.getStart();
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
