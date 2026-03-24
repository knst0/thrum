import { Show, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { useFlow } from "../context";
import { createBoxSelection } from "../hooks/createBoxSelection";

interface FlowCanvasProps {
  children: JSX.Element;
  style?: JSX.CSSProperties;
}

export function FlowCanvas(props: FlowCanvasProps) {
  const flow = useFlow();
  const { store } = flow;
  const boxSel = createBoxSelection(store);
  // oxlint-disable-next-line no-unassigned-vars
  let ref!: HTMLDivElement;
  let isPanning = false;
  let lastPan = { x: 0, y: 0 };

  function isBackground(target: EventTarget | null): boolean {
    let el = target as Element | null;
    while (el && el !== ref) {
      if ((el as HTMLElement).dataset?.nodeid !== undefined) return false;
      el = el.parentElement;
    }
    return true;
  }

  function onKeyDown(e: KeyboardEvent) {
    const state = store.getState();
    if (e.key !== state.deleteKeyCode) return;
    e.preventDefault();
    store.batch(() => {
      store.applyNodeChanges([...state.selectedNodes].map((id) => ({ type: "remove" as const, id })));
      store.applyEdgeChanges([...state.selectedEdges].map((id) => ({ type: "remove" as const, id })));
    });
  }

  function onPointerDown(e: PointerEvent) {
    ref.focus({ preventScroll: true });
    if (e.button === 1) {
      // Middle mouse → pan
      isPanning = true;
      lastPan = { x: e.clientX, y: e.clientY };
      ref.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (e.button === 0 && isBackground(e.target)) {
      // Left drag on background → box selection
      boxSel.onPointerDown(e);
      ref.setPointerCapture(e.pointerId);
    }
  }

  let connectionRaf = 0;
  function onPointerMove(e: PointerEvent) {
    if (isPanning) {
      const vp = store.getState().viewport;
      store.setViewport({ ...vp, x: vp.x + e.clientX - lastPan.x, y: vp.y + e.clientY - lastPan.y });
      lastPan = { x: e.clientX, y: e.clientY };
      return;
    }
    boxSel.onPointerMove(e);
    if (store.getState().connectionStartHandle) {
      cancelAnimationFrame(connectionRaf);
      const pos = { x: e.clientX, y: e.clientY };
      connectionRaf = requestAnimationFrame(() => store.updateConnection(pos));
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (isPanning) {
      isPanning = false;
      return;
    }
    boxSel.onPointerUp(e);
    store.cancelConnection();
  }

  onMount(() => {
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = 1 - e.deltaY * 0.005;
      store.zoomAroundPoint(factor, { x: e.clientX, y: e.clientY });
    }
    ref.addEventListener("wheel", onWheel, { passive: false });
    onCleanup(() => ref.removeEventListener("wheel", onWheel));
  });

  return (
    <div
      ref={ref}
      tabIndex={0}
      style={{ position: "absolute", inset: "0", overflow: "hidden", outline: "none", ...props.style }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={onKeyDown}
    >
      {props.children}
      <Show when={boxSel.rect()}>
        {(r) => {
          const containerRect = ref.getBoundingClientRect();
          return (
            <div
              data-box-selection
              style={{
                position: "absolute",
                left: `${r().x - containerRect.left}px`,
                top: `${r().y - containerRect.top}px`,
                width: `${r().width}px`,
                height: `${r().height}px`,
                "pointer-events": "none",
                background: "rgba(99, 149, 255, 0.08)",
                border: "1px solid rgba(99, 149, 255, 0.7)",
                "border-radius": "2px",
              }}
            />
          );
        }}
      </Show>
    </div>
  );
}
