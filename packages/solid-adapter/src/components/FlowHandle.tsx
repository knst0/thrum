import type { JSX } from "solid-js";
import type { HandleType } from "@thrum/core";
import { handleId as toHandleId } from "@thrum/core";
import { useFlow, useNodeId } from "../context";

interface FlowHandleProps {
  type: HandleType;
  /** Plain string for JSX ergonomics; branded internally at the boundary. */
  id?: string;
  style?: JSX.CSSProperties;
  class?: string;
}

export function FlowHandle(props: FlowHandleProps) {
  const flow = useFlow();
  const nodeId = useNodeId();
  // Brand at the JSX boundary: users write id="out", we brand it for the store API.
  const hId = () => toHandleId(props.id ?? props.type);

  const canConnect = () => {
    const start = flow.connectionStartHandle();
    return !!start && start.type !== props.type;
  };

  const isTarget = () => {
    if (!canConnect()) return false;
    const t = flow.connectionTarget();
    return t?.nodeId === nodeId && t?.handleId === hId();
  };

  function onPointerDown(e: PointerEvent) {
    e.stopPropagation();
    const existing = flow.store.getState().connectionStartHandle;
    if (existing && !(existing.nodeId === nodeId && existing.handleId === hId())) {
      // Active connection from a different handle → click-to-connect: complete it
      const conn = flow.store.endConnection(nodeId, hId(), props.type);
      if (conn) flow.onConnect?.(conn);
      else flow.store.cancelConnection(); // incompatible handle → cancel entirely
      flow.setConnectionTarget(null);
      return;
    }
    // No active connection (or clicking same handle) → start new connection
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const position = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    flow.store.startConnection(nodeId, hId(), props.type, position);
  }

  function onPointerUp(e: PointerEvent) {
    e.stopPropagation();
    const start = flow.store.getState().connectionStartHandle;
    if (!start) return; // Already completed via click-to-connect in onPointerDown
    if (start.nodeId === nodeId && start.handleId === hId()) {
      // PointerUp on the same handle that started → keep active for click-to-connect
      return;
    }
    // Drag-to-connect: only complete if the pointer was actively hovering this handle.
    // connectionTarget is set by onPointerEnter and cleared by onPointerLeave, so it
    // reliably reflects whether the pointer is currently inside this handle's hit area.
    // This prevents accidental connections when the cursor grazes a handle on release.
    const target = flow.connectionTarget();
    if (!target || target.nodeId !== nodeId || target.handleId !== hId()) {
      flow.store.cancelConnection();
      flow.setConnectionTarget(null);
      return;
    }
    const conn = flow.store.endConnection(nodeId, hId(), props.type);
    if (conn) flow.onConnect?.(conn);
    else flow.store.cancelConnection();
    flow.setConnectionTarget(null);
  }

  function onPointerEnter() {
    if (canConnect()) {
      flow.setConnectionTarget({ nodeId, handleId: hId() });
    }
  }

  function onPointerLeave() {
    flow.setConnectionTarget(null);
  }

  return (
    <div
      data-handleid={hId()}
      data-handletype={props.type}
      data-connection-target={isTarget() ? "" : undefined}
      class={props.class}
      style={{
        "pointer-events": "all",
        ...props.style,
        ...(isTarget() ? { outline: "2px solid #60a5fa", "outline-offset": "2px" } : {}),
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    />
  );
}
