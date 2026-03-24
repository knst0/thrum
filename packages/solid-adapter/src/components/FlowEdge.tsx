import { Show, createMemo } from "solid-js";
import type { JSX } from "solid-js";
import type { EdgeBase } from "@thrum/core";
import { getEdgePath, resolveHandleCenter } from "@thrum/core";
import { useFlow } from "../context";
import type { EdgeCoords } from "./FlowEdgeLayer";

interface FlowEdgeProps {
  edge: EdgeBase;
  children: (edge: EdgeBase, coords: EdgeCoords, selected: boolean, hitPath: string) => JSX.Element;
}

export function FlowEdge(props: FlowEdgeProps) {
  const flow = useFlow();

  function resolveEdgeCoords(edge: EdgeBase): EdgeCoords | null {
    const state = flow.store.getState();
    const sourceNode = state.nodes.get(edge.source);
    const targetNode = state.nodes.get(edge.target);
    if (!sourceNode || !targetNode) return null;

    const sw = sourceNode.measured?.width ?? 150;
    const sh = sourceNode.measured?.height ?? 50;
    const tw = targetNode.measured?.width ?? 150;
    const th = targetNode.measured?.height ?? 50;

    const src = resolveHandleCenter(sourceNode.handleBounds, edge.sourceHandle, "source", sw, sh);
    const tgt = resolveHandleCenter(targetNode.handleBounds, edge.targetHandle, "target", tw, th);

    return {
      sourceX: sourceNode.absolutePosition.x + src.x,
      sourceY: sourceNode.absolutePosition.y + src.y,
      sourcePosition: src.position,
      targetX: targetNode.absolutePosition.x + tgt.x,
      targetY: targetNode.absolutePosition.y + tgt.y,
      targetPosition: tgt.position,
    };
  }

  const derived = createMemo(
    () => {
      // Track both signals: coords depend on node positions, selection depends on edge state.
      void flow.nodes();
      void flow.edges();
      if (props.edge.hidden) return null;
      const c = resolveEdgeCoords(props.edge);
      if (!c) return null;
      const selected = flow.store.getState().selectedEdges.has(props.edge.id);
      const pathFn = getEdgePath(props.edge.type ?? flow.store.getState().defaultEdgeType);
      const { path: hitPath } = pathFn(c);
      return { c, selected, hitPath };
    },
    undefined,
    { equals: false },
  );

  function onPointerDown(e: PointerEvent) {
    e.stopPropagation();
    const state = flow.store.getState();
    if (e.ctrlKey) {
      flow.store.setSelectedEdges([...state.selectedEdges].filter((id) => id !== props.edge.id));
    } else if (e.shiftKey) {
      const next = new Set(state.selectedEdges);
      if (next.has(props.edge.id)) next.delete(props.edge.id);
      else next.add(props.edge.id);
      flow.store.setSelectedEdges([...next]);
    } else {
      flow.store.setSelectedNodes([]);
      flow.store.setSelectedEdges([props.edge.id]);
    }
  }

  return (
    <Show when={derived()}>
      {(d) => (
        <g>
          {/* Wide transparent hit area — pointer-events="stroke" activates on the stroke region regardless of color. */}
          <path
            d={d().hitPath}
            stroke="transparent"
            stroke-width="10"
            fill="none"
            pointer-events="stroke"
            style={{ cursor: "pointer" }}
            onPointerDown={onPointerDown}
          />
          {props.children(props.edge, d().c, d().selected, d().hitPath)}
        </g>
      )}
    </Show>
  );
}
