import { For } from "solid-js";
import type { JSX } from "solid-js";
import type { InternalNode } from "@thrum/core";
import { useFlow } from "../context";

interface FlowNodeLayerProps {
  children: (node: InternalNode) => JSX.Element;
}

export function FlowNodeLayer(props: FlowNodeLayerProps) {
  const flow = useFlow();

  const transform = () => {
    const vp = flow.viewport();
    return `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`;
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: "0",
        "pointer-events": "none",
        transform: transform(),
        "transform-origin": "0 0",
      }}
    >
      <For each={flow.nodes()}>{(node) => !node.hidden && props.children(node)}</For>
    </div>
  );
}
