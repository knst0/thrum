import { createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { useFlow } from "../context";

interface FlowCanvasProps {
  children: JSX.Element;
  style?: JSX.CSSProperties;
}

export function FlowCanvas(props: FlowCanvasProps) {
  const flow = useFlow();
  const { store } = flow;
  // oxlint-disable-next-line no-unassigned-vars
  let ref!: HTMLDivElement;
  let isPanning = false;
  let lastPan = { x: 0, y: 0 };
  const activeTouchPointers = new Map<number, { x: number; y: number }>();
  const [isPinching, setIsPinching] = createSignal(false);

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

    if (e.pointerType === "touch") {
      activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activeTouchPointers.size >= 2) {
        // Second finger down → pinch gesture
        isPanning = false;
        setIsPinching(true);
        return;
      }
      // Single finger → pan
      isPanning = true;
      lastPan = { x: e.clientX, y: e.clientY };
      ref.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    if (e.button === 1) {
      // Middle mouse → pan
      isPanning = true;
      lastPan = { x: e.clientX, y: e.clientY };
      ref.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  }

  let connectionRaf = 0;
  function onPointerMove(e: PointerEvent) {
    if (e.pointerType === "touch") {
      activeTouchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (isPinching()) return;
    if (isPanning) {
      const vp = store.getState().viewport;
      store.setViewport({ ...vp, x: vp.x + e.clientX - lastPan.x, y: vp.y + e.clientY - lastPan.y });
      lastPan = { x: e.clientX, y: e.clientY };
      return;
    }
    if (store.getState().connectionStartHandle) {
      cancelAnimationFrame(connectionRaf);
      const pos = { x: e.clientX, y: e.clientY };
      connectionRaf = requestAnimationFrame(() => store.updateConnection(pos));
    }
  }

  function removeTouchPointer(pointerId: number) {
    activeTouchPointers.delete(pointerId);
    if (activeTouchPointers.size < 2) setIsPinching(false);
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerType === "touch") removeTouchPointer(e.pointerId);
    if (isPanning) {
      isPanning = false;
      return;
    }
    store.cancelConnection();
  }

  function onPointerCancel(e: PointerEvent) {
    if (e.pointerType === "touch") removeTouchPointer(e.pointerId);
    isPanning = false;
  }

  onMount(() => {
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = 1 - e.deltaY * 0.005;
      const { left, top } = ref.getBoundingClientRect();
      store.zoomAroundPoint(factor, { x: e.clientX - left, y: e.clientY - top });
    }
    ref.addEventListener("wheel", onWheel, { passive: false });
    onCleanup(() => ref.removeEventListener("wheel", onWheel));
  });

  return (
    <div
      ref={ref}
      tabIndex={0}
      style={{
        position: "absolute",
        inset: "0",
        overflow: "hidden",
        outline: "none",
        ...props.style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      {props.children}
    </div>
  );
}
