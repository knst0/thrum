import { For } from "solid-js";
import type { JSX } from "solid-js";
import type { EdgeBase, HandlePosition } from "@thrum/core";
import { useFlow } from "../context";
import { FlowEdge } from "./FlowEdge";

export interface EdgeCoords {
  sourceX: number;
  sourceY: number;
  sourcePosition: HandlePosition;
  targetX: number;
  targetY: number;
  targetPosition: HandlePosition;
}

interface FlowEdgeLayerProps {
  children: (edge: EdgeBase, coords: EdgeCoords, selected: boolean, hitPath: string) => JSX.Element;
}

export function FlowEdgeLayer(props: FlowEdgeLayerProps) {
  const flow = useFlow();
  const vp = () => flow.viewport();

  return (
    // pointer-events: none on SVG keeps canvas background clickable.
    // Child elements with explicit pointer-events CAN still receive events
    // because CSS pointer-events is not inherited (per spec).
    <svg
      style={{
        position: "absolute",
        inset: "0",
        width: "100%",
        height: "100%",
        overflow: "visible",
        "pointer-events": "none",
      }}
    >
      <g transform={`translate(${vp().x} ${vp().y}) scale(${vp().zoom})`}>
        <For each={flow.edges()}>{(edge) => <FlowEdge edge={edge}>{props.children}</FlowEdge>}</For>
      </g>
    </svg>
  );
}
